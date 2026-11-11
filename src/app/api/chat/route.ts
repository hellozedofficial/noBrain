import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { walletService } from "@/lib/wallet"
import { getContextWindowLimit, calculateConversationTokens, formatTokenCount } from "@/lib/contextWindow"
import { streamOpenRouterChat, normalizeChatModelId } from "@/lib/openrouter"
import crypto from "crypto"
import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime"

// Internal server-only model IDs for AWS Bedrock
const INTERNAL_BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-120b-1:0"
const VISION_BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
const DEFAULT_MODEL_ID = "nobrain-1.5"

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

function formatBedrockMessages(history: Array<{ role: string; content: string }>) {
  const result: Array<{ role: "user" | "assistant"; content: Array<{ text: string }> }> = []

  for (const item of history) {
    const text = (item.content || "").trim()
    if (!text) continue

    const role = item.role === "assistant" ? "assistant" : "user"

    if (result.length === 0) {
      if (role === "assistant") continue
      result.push({ role: "user", content: [{ text }] })
    } else {
      const last = result[result.length - 1]
      if (last.role === role) {
        last.content[0].text += `\n\n${text}`
      } else {
        result.push({ role, content: [{ text }] })
      }
    }
  }

  return result
}

/** Build a Bedrock vision message with an inline image + text for Nova Pro */
async function buildVisionMessage(
  text: string,
  imageSource: { url?: string; dataUrl?: string }
): Promise<{ role: "user"; content: any[] }> {
  let imageBlock: any

  if (imageSource.dataUrl) {
    const match = imageSource.dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
    if (match) {
      const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
      const base64Data = match[2]
      imageBlock = {
        image: {
          format: mediaType.split("/")[1].replace("jpeg", "jpeg"),
          source: { bytes: Buffer.from(base64Data, "base64") },
        },
      }
    }
  } else if (imageSource.url) {
    try {
      const response = await fetch(imageSource.url)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const contentType = response.headers.get("content-type") || "image/jpeg"
      const format = contentType.includes("png")
        ? "png"
        : contentType.includes("gif")
        ? "gif"
        : contentType.includes("webp")
        ? "webp"
        : "jpeg"
      imageBlock = {
        image: {
          format,
          source: { bytes: buffer },
        },
      }
    } catch {
      return {
        role: "user",
        content: [{ text: `${text}\n[Attached Image URL: ${imageSource.url}]` }],
      }
    }
  }

  if (!imageBlock) {
    return { role: "user", content: [{ text }] }
  }

  return {
    role: "user",
    content: [imageBlock, { text: text || "What is in this image?" }],
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to chat." },
        { status: 401 }
      )
    }
    const userId = user.id

    const rawBody = await req.json()
    const { conversationId, imageUrl, imageDataUrl, model: requestedModel } = rawBody
    let message = typeof rawBody.message === "string" ? rawBody.message : ""

    if (!message.trim() && !imageUrl && !imageDataUrl) {
      return NextResponse.json({ error: "Message or image is required" }, { status: 400 })
    }

    if (!message.trim() && (imageUrl || imageDataUrl)) {
      message = "What is in this image?"
    }

    const currentConvId = conversationId || crypto.randomBytes(16).toString("hex")

    // Check if conversation already exists and has prior messages (model lock enforcement)
    const existing = await query<any>(
      "SELECT id, title, model, user_id FROM conversations WHERE id = ? AND user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)",
      [currentConvId, userId]
    )

    let hasPriorMessages = false
    if (existing.length > 0) {
      const countRows = await query<any>(
        "SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)",
        [currentConvId]
      )
      hasPriorMessages = Number(countRows[0]?.cnt || 0) > 0
    }

    const normalizedRequested =
      typeof requestedModel === "string" && requestedModel.trim()
        ? normalizeChatModelId(requestedModel)
        : null

    let effectiveModelSlug = normalizedRequested
    if (existing.length > 0 && hasPriorMessages && existing[0].model) {
      const lockedModel = normalizeChatModelId(existing[0].model)
      if (normalizedRequested && normalizedRequested !== lockedModel) {
        return NextResponse.json(
          {
            error: "Model cannot be switched mid-conversation. Please start a New Chat to use a different model.",
            code: "MODEL_LOCKED",
            lockedModel,
          },
          { status: 400 }
        )
      }
      effectiveModelSlug = lockedModel
    }

    // Resolve model record from platform_models table (never silently fall back when a specific model was requested)
    let modelRecord: any = null
    if (effectiveModelSlug) {
      const rows = await query<any>(
        "SELECT * FROM platform_models WHERE id = ? AND is_active = 1",
        [effectiveModelSlug]
      )
      if (rows.length > 0) {
        modelRecord = rows[0]
      } else if (effectiveModelSlug !== DEFAULT_MODEL_ID) {
        return NextResponse.json(
          {
            error: `Selected AI model "${effectiveModelSlug}" is unavailable or inactive. Please start a New Chat and choose an active model.`,
            code: "MODEL_UNAVAILABLE",
          },
          { status: 400 }
        )
      }
    } else {
      const defaultRows = await query<any>(
        "SELECT * FROM platform_models WHERE is_default = 1 AND is_active = 1 LIMIT 1"
      )
      if (defaultRows.length > 0) modelRecord = defaultRows[0]
    }

    if (!modelRecord) {
      modelRecord = {
        id: DEFAULT_MODEL_ID,
        name: "noBrain 1.5",
        provider: "builtin",
        input_price_per_million: 60,
        output_price_per_million: 110,
        input_text: 1,
        input_image: 1,
        output_text: 1,
        output_image: 0,
      }
    }

    const selectedModel = modelRecord.id
    const modelDisplayName = modelRecord.name
    const isExternalOpenRouter = modelRecord.provider === "openrouter"
    const inputPricePerM = Number(modelRecord.input_price_per_million) || 60
    const outputPricePerM = Number(modelRecord.output_price_per_million) || 110

    // Check if platform is prepaid only
    const pricing = walletService.getPricingConfig()
    if (pricing.prepaidOnly) {
      const balance = await walletService.getBalance(userId)
      const minInputCost = (100 / 1000000) * inputPricePerM
      const minOutputCost = (100 / 1000000) * outputPricePerM
      const minTotalCost = minInputCost + minOutputCost

      if (balance < minTotalCost) {
        return NextResponse.json(
          {
            error: "Insufficient balance. Please recharge your wallet to continue chatting.",
            code: "INSUFFICIENT_BALANCE",
            requiredAmount: minTotalCost,
            currentBalance: balance,
          },
          { status: 402 }
        )
      }
    }

    // Update user's last_used_model
    await execute("UPDATE users SET last_used_model = ? WHERE id = ?", [
      selectedModel,
      userId,
    ])

    const trimmedPrompt = message.trim()
    const autoTitle =
      trimmedPrompt.length > 35 ? trimmedPrompt.slice(0, 35) + "..." : trimmedPrompt

    if (existing.length === 0) {
      await execute(
        "INSERT INTO conversations (id, title, model, user_id) VALUES (?, ?, ?, ?)",
        [currentConvId, autoTitle, selectedModel, userId]
      )
    } else {
      const updateFields: any[] = [selectedModel]
      let sql = "UPDATE conversations SET model = ?"
      if (existing[0].title === "New Chat" && trimmedPrompt) {
        sql += ", title = ?"
        updateFields.push(autoTitle)
      }
      sql += " WHERE id = ? AND user_id = ?"
      updateFields.push(currentConvId, userId)
      await execute(sql, updateFields)
    }

    // Check conversation context window limit
    const contextLimit = getContextWindowLimit()
    if (existing.length > 0) {
      const priorMessages = await query<any>(
        "SELECT role, content, prompt_tokens, completion_tokens, total_tokens FROM messages WHERE conversation_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at ASC",
        [currentConvId]
      )
      const currentTokens = calculateConversationTokens(priorMessages)
      if (currentTokens >= contextLimit) {
        return NextResponse.json(
          {
            error: `Context window limit of ${formatTokenCount(contextLimit)} tokens reached for this chat. Please start a new chat to continue.`,
            code: "CONTEXT_WINDOW_LIMIT_REACHED",
            contextLimit,
            currentTokens,
          },
          { status: 400 }
        )
      }
    }

    const estimatedPromptTokens = Math.max(1, Math.ceil(message.length / 4))

    // Insert user message into MySQL
    const userMsgId = crypto.randomUUID()
    await execute(
      "INSERT INTO messages (id, conversation_id, role, content, model, image_url, prompt_tokens) VALUES (?, ?, 'user', ?, ?, ?, ?)",
      [userMsgId, currentConvId, message, selectedModel, imageUrl || null, estimatedPromptTokens]
    )

    // Check if message requires Canvas studio design
    const isCanvasIntent =
      /(?:logo|brandmark|brand mark|monogram|emblem|wordmark|symbol|vector logo|canva|canvas|banner|poster|flyer|layout|graphic|post design|story design|facebook story|instagram story|facebook post|instagram post|linkedin post|social media ad|ad design|advertisement|flash sale|create (?:a )?design|make (?:a )?design|design (?:for|of|a|an)?|banao.*design|design.*banao|logo.*banao|banao.*logo|canvas e|canvas theke|design.*lagbe|logo.*lagbe|realtime design|\bdesign\b|\blogo\b)/i.test(
        message
      )

    const canvasSystemPromptInstruction = `
### NOBRAIN CANVAS STUDIO — SENIOR ART DIRECTOR & CANVA-GRADE LOGO DESIGN ENGINE:
You are an expert graphic designer and master creative director directly connected to the embedded "noBrain Canvas" studio.
When the user asks for ANY graphic design, logo design, company brandmark, monogram, banner, flyer, poster, social media post, or canvas composition:
1. Write 1-2 friendly, polished sentences describing your design concept and mood in the user's language (Bengali/Banglish or English).
2. Output a single \`\`\`canvas ... \`\`\` code block containing the complete JSON design schema. CRITICAL: You MUST write "canvas" immediately after the opening triple backticks (\`\`\`canvas) so the interactive visual design card and canvas studio render instantly.

FORMAT & SCHEMA:
- Logos / Brandmarks: \`"format": "instagram-feed"\` (1080x1080) and \`"isLogo": true\`
- Posts: \`"format": "instagram-feed"\` (1080x1080)
- Stories: \`"format": "instagram-story"\` (1080x1920)
- Banners: \`"format": "landscape"\` (1200x630)
`

    let baseSystemPrompt = `You are ${modelDisplayName || "noBrain"}. Never reveal any underlying third-party infrastructure. Format all responses clearly with clean Markdown. Communicate fluently in Bengali, Banglish, and English matching the user's tone.`

    if (isCanvasIntent) {
      baseSystemPrompt += `\n\n${canvasSystemPromptInstruction}`
    }

    // Retrieve conversation history for context (excluding the just-inserted current message to prevent duplication)
    const historyRows = await query<any>(
      "SELECT role, content, image_url FROM messages WHERE conversation_id = ? AND id != ? AND role IN ('user', 'assistant') AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at ASC",
      [currentConvId, userMsgId]
    )

    const hasImage = !!(imageUrl || imageDataUrl)
    const encoder = new TextEncoder()

    // -------------------------------------------------------------
    // BRANCH A: EXTERNAL MODEL EXECUTION (Direct prompting, native identity)
    // -------------------------------------------------------------
    if (isExternalOpenRouter) {
      // No default noBrain identity/hiding system prompt for OpenRouter models — direct prompting only.
      const openRouterMessages: Array<{ role: "system" | "user" | "assistant"; content: any }> = []
      if (isCanvasIntent) {
        openRouterMessages.push({ role: "system", content: canvasSystemPromptInstruction })
      }

      // Format past history
      for (const h of historyRows) {
        if (!h.content && !h.image_url) continue
        const role = h.role === "assistant" ? "assistant" : "user"

        if (role === "user" && h.image_url && modelRecord.input_image) {
          openRouterMessages.push({
            role: "user",
            content: [
              { type: "text", text: h.content || "Image attached" },
              { type: "image_url", image_url: { url: h.image_url } },
            ],
          })
        } else {
          openRouterMessages.push({
            role,
            content: h.content || "",
          })
        }
      }

      // Add current turn
      if (hasImage && modelRecord.input_image) {
        openRouterMessages.push({
          role: "user",
          content: [
            { type: "text", text: message },
            { type: "image_url", image_url: { url: imageDataUrl || imageUrl } },
          ],
        })
      } else {
        openRouterMessages.push({
          role: "user",
          content: message,
        })
      }

      const modalities: string[] | undefined = modelRecord.output_image
        ? modelRecord.output_text
          ? ["image", "text"]
          : ["image"]
        : undefined

      const openRouterRes = await streamOpenRouterChat({
        model: selectedModel,
        messages: openRouterMessages,
        modalities,
      })

      const readable = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                conversationId: currentConvId,
                model: selectedModel,
                modelName: modelDisplayName,
                isCanvas: isCanvasIntent,
                type: "meta",
              })}\n\n`
            )
          )

          let fullAssistantResponse = ""
          let promptTokens = estimatedPromptTokens
          let completionTokens = 0
          let totalTokens = estimatedPromptTokens
          let hasStartedReasoning = false
          let hasEndedReasoning = false

          try {
            if (openRouterRes.body) {
              const reader = openRouterRes.body.getReader()
              const decoder = new TextDecoder("utf-8")
              let buffer = ""

              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                  const trimmed = line.trim()
                  if (!trimmed || !trimmed.startsWith("data:")) continue
                  const dataStr = trimmed.slice(5).trim()
                  if (dataStr === "[DONE]") continue

                  try {
                    const parsed = JSON.parse(dataStr)
                    const delta = parsed.choices?.[0]?.delta
                    if (!delta) continue

                    // Reasoning
                    const reasoning = delta.reasoning || delta.reasoning_content
                    if (reasoning) {
                      if (!hasStartedReasoning) {
                        hasStartedReasoning = true
                        fullAssistantResponse += "<think>\n"
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ token: "<think>\n", type: "token" })}\n\n`)
                        )
                      }
                      fullAssistantResponse += reasoning
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ token: reasoning, type: "token" })}\n\n`)
                      )
                    }

                    // Content
                    const content = delta.content
                    if (content) {
                      if (hasStartedReasoning && !hasEndedReasoning) {
                        hasEndedReasoning = true
                        fullAssistantResponse += "\n</think>\n\n"
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ token: "\n</think>\n\n", type: "token" })}\n\n`)
                        )
                      }
                      fullAssistantResponse += content
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ token: content, type: "token" })}\n\n`)
                      )
                    }

                    // Multimodal Output Images (OpenRouter image generation)
                    const deltaImages = delta.images || parsed.choices?.[0]?.message?.images
                    if (Array.isArray(deltaImages) && deltaImages.length > 0) {
                      for (const img of deltaImages) {
                        const imgUrl = img?.image_url?.url || img?.url
                        if (imgUrl) {
                          const imgMarkdown = `\n\n![Generated Image](${imgUrl})\n\n`
                          fullAssistantResponse += imgMarkdown
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ token: imgMarkdown, type: "token" })}\n\n`)
                          )
                        }
                      }
                    }

                    if (parsed.usage) {
                      promptTokens = parsed.usage.prompt_tokens || promptTokens
                      completionTokens = parsed.usage.completion_tokens || completionTokens
                      totalTokens = parsed.usage.total_tokens || (promptTokens + completionTokens)
                    }
                  } catch {}
                }
              }
            }

            if (hasStartedReasoning && !hasEndedReasoning) {
              hasEndedReasoning = true
              fullAssistantResponse += "\n</think>\n\n"
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: "\n</think>\n\n", type: "token" })}\n\n`)
              )
            }

            if (completionTokens === 0 && fullAssistantResponse.length > 0) {
              completionTokens = Math.max(1, Math.ceil(fullAssistantResponse.length / 4))
              totalTokens = promptTokens + completionTokens
            }

            let assistantMsgId: string | null = null
            if (fullAssistantResponse.trim()) {
              assistantMsgId = crypto.randomUUID()
              await execute(
                "INSERT INTO messages (id, conversation_id, role, content, model, prompt_tokens, completion_tokens, total_tokens) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)",
                [
                  assistantMsgId,
                  currentConvId,
                  fullAssistantResponse,
                  selectedModel,
                  promptTokens,
                  completionTokens,
                  totalTokens,
                ]
              )
              await execute(
                "UPDATE conversations SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [selectedModel, currentConvId]
              )

              // Deduct wallet charges
              if (pricing.prepaidOnly) {
                try {
                  await walletService.deductForChatUsage(
                    userId,
                    promptTokens,
                    completionTokens,
                    {
                      inputPerMillionPrice: inputPricePerM,
                      outputPerMillionPrice: outputPricePerM,
                      modelName: modelDisplayName,
                    }
                  )
                } catch (dErr) {
                  console.error("Wallet deduction error:", dErr)
                }
              }
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  messageId: assistantMsgId,
                  usage: {
                    prompt_tokens: promptTokens,
                    completion_tokens: completionTokens,
                    total_tokens: totalTokens,
                    model: selectedModel,
                  },
                  contextUsage: {
                    current: totalTokens,
                    limit: contextLimit,
                    percentage: Math.min(100, Math.round((totalTokens / contextLimit) * 100)),
                    isFull: totalTokens >= contextLimit,
                  },
                })}\n\n`
              )
            )
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (streamError) {
            console.error("OpenRouter stream error:", streamError)
            controller.error(streamError)
          }
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      })
    }

    // -------------------------------------------------------------
    // BRANCH B: NATIVE AWS BEDROCK EXECUTION (noBrain 1.5)
    // -------------------------------------------------------------
    const activeBedrockModelId = hasImage ? VISION_BEDROCK_MODEL_ID : INTERNAL_BEDROCK_MODEL_ID

    let formattedHistory: Array<{ role: "user" | "assistant"; content: any[] }>

    if (hasImage) {
      const textHistory = formatBedrockMessages(
        historyRows.filter((r: any) => r.role !== "user" || !r.image_url)
      )
      const visionMsg = await buildVisionMessage(message, {
        url: imageUrl || undefined,
        dataUrl: imageDataUrl || undefined,
      })
      formattedHistory = [...textHistory, visionMsg]
    } else {
      formattedHistory = formatBedrockMessages([
        ...historyRows,
        { role: "user", content: message },
      ])
    }

    if (formattedHistory.length === 0) {
      formattedHistory.push({
        role: "user",
        content: [{ text: message }],
      })
    }

    const command = new ConverseStreamCommand({
      modelId: activeBedrockModelId,
      messages: formattedHistory,
      system: [{ text: baseSystemPrompt }],
    })

    const bedrockResponse = await bedrockClient.send(command)

    let promptTokens = estimatedPromptTokens
    let completionTokens = 0
    let totalTokens = estimatedPromptTokens
    let fullAssistantResponse = ""

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              conversationId: currentConvId,
              model: selectedModel,
              modelName: modelDisplayName,
              isCanvas: isCanvasIntent,
              type: "meta",
            })}\n\n`
          )
        )

        let hasStartedReasoning = false
        let hasEndedReasoning = false

        try {
          if (bedrockResponse.stream) {
            for await (const chunk of bedrockResponse.stream) {
              const deltaAny = chunk.contentBlockDelta?.delta as any
              const reasoningDelta = deltaAny?.reasoningContent?.text
              if (reasoningDelta) {
                if (!hasStartedReasoning) {
                  hasStartedReasoning = true
                  fullAssistantResponse += "<think>\n"
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token: "<think>\n", type: "token" })}\n\n`)
                  )
                }
                fullAssistantResponse += reasoningDelta
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: reasoningDelta, type: "token" })}\n\n`)
                )
              }

              const textDelta = chunk.contentBlockDelta?.delta?.text
              if (textDelta) {
                if (hasStartedReasoning && !hasEndedReasoning) {
                  hasEndedReasoning = true
                  fullAssistantResponse += "\n</think>\n\n"
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token: "\n</think>\n\n", type: "token" })}\n\n`)
                  )
                }
                fullAssistantResponse += textDelta
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: textDelta, type: "token" })}\n\n`)
                )
              }

              if (chunk.metadata?.usage) {
                promptTokens = chunk.metadata.usage.inputTokens ?? promptTokens
                completionTokens = chunk.metadata.usage.outputTokens ?? completionTokens
                totalTokens = chunk.metadata.usage.totalTokens ?? (promptTokens + completionTokens)
              }
            }
          }

          if (hasStartedReasoning && !hasEndedReasoning) {
            hasEndedReasoning = true
            fullAssistantResponse += "\n</think>\n\n"
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: "\n</think>\n\n", type: "token" })}\n\n`)
            )
          }

          if (completionTokens === 0 && fullAssistantResponse.length > 0) {
            completionTokens = Math.max(1, Math.ceil(fullAssistantResponse.length / 4))
            totalTokens = promptTokens + completionTokens
          }

          let assistantMsgId: string | null = null
          if (fullAssistantResponse.trim()) {
            assistantMsgId = crypto.randomUUID()
            await execute(
              "INSERT INTO messages (id, conversation_id, role, content, model, prompt_tokens, completion_tokens, total_tokens) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)",
              [
                assistantMsgId,
                currentConvId,
                fullAssistantResponse,
                selectedModel,
                promptTokens,
                completionTokens,
                totalTokens,
              ]
            )
            await execute(
              "UPDATE conversations SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [selectedModel, currentConvId]
            )
          }

          // Deduct charges
          if (pricing.prepaidOnly && fullAssistantResponse.trim()) {
            try {
              await walletService.deductForChatUsage(
                userId,
                promptTokens,
                completionTokens,
                {
                  inputPerMillionPrice: inputPricePerM,
                  outputPerMillionPrice: outputPricePerM,
                  modelName: modelDisplayName,
                }
              )
            } catch (deductionError) {
              console.error("Error deducting from wallet:", deductionError)
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                messageId: assistantMsgId,
                usage: {
                  prompt_tokens: promptTokens,
                  completion_tokens: completionTokens,
                  total_tokens: totalTokens,
                  model: selectedModel,
                },
                contextUsage: {
                  current: totalTokens,
                  limit: contextLimit,
                  percentage: Math.min(100, Math.round((totalTokens / contextLimit) * 100)),
                  isFull: totalTokens >= contextLimit,
                },
              })}\n\n`
            )
          )
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (streamError) {
          console.error("Stream processing error:", streamError)
          controller.error(streamError)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (err: any) {
    console.error("Server chat execution error:", err)
    return NextResponse.json(
      { error: "Failed to process chat request. Please try again." },
      { status: 500 }
    )
  }
}
