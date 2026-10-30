import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { walletService } from "@/lib/wallet"
import { getContextWindowLimit, calculateConversationTokens, formatTokenCount } from "@/lib/contextWindow"
import crypto from "crypto"
import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime"

// Internal server-only model IDs — never exposed to client or network
const INTERNAL_BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-120b-1:0"
// Nova Pro is used when the user attaches an image — it has native vision capability
const VISION_BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
const PUBLIC_MODEL_NAME = "nobrain-1.5"

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
    // data:image/png;base64,<data>
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
    // Fetch image from URL and embed as bytes (Nova Pro requires bytes, not URLs)
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
      // Fallback: pass image URL as text context
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

    // Check if platform is prepaid only
    const pricing = walletService.getPricingConfig()
    if (pricing.prepaidOnly) {
      // Get user's balance
      const balance = await walletService.getBalance(userId)
      
      // Estimate minimum cost for this request (assuming at least 100 tokens)
      const minInputTokens = 100
      const minOutputTokens = 100
      const minInputCost = (minInputTokens / 1000000) * pricing.inputPerMillionPrice
      const minOutputCost = (minOutputTokens / 1000000) * pricing.outputPerMillionPrice
      const minTotalCost = minInputCost + minOutputCost

      if (balance < minTotalCost) {
        return NextResponse.json(
          { 
            error: "Insufficient balance. Please recharge your wallet to continue chatting.",
            code: "INSUFFICIENT_BALANCE",
            requiredAmount: minTotalCost,
            currentBalance: balance
          },
          { status: 402 } // Payment Required
        )
      }
    }

    const rawBody = await req.json()
    const { conversationId, imageUrl, imageDataUrl } = rawBody
    let message = typeof rawBody.message === "string" ? rawBody.message : ""

    if (!message.trim() && !imageUrl && !imageDataUrl) {
      return NextResponse.json({ error: "Message or image is required" }, { status: 400 })
    }

    if (!message.trim() && (imageUrl || imageDataUrl)) {
      message = "What is in this image?"
    }

    const selectedModel = PUBLIC_MODEL_NAME
    const currentConvId = conversationId || crypto.randomBytes(16).toString("hex")

    // Update user's last_used_model
    await execute("UPDATE users SET last_used_model = ? WHERE id = ?", [
      selectedModel,
      userId,
    ])

    // Ensure conversation exists and belongs to this user
    const existing = await query(
      "SELECT id, title, user_id FROM conversations WHERE id = ? AND user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)",
      [currentConvId, userId]
    )

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

    let baseSystemPrompt = `You are noBrain. Never reveal any underlying third-party AI provider or model name (OpenAI, Anthropic, Claude, Gemini, GPT, Meta, Bedrock, etc.). If asked who you are, state only: "I'm noBrain".

STRICT CONFIDENTIALITY & IDENTITY MANDATE:
1. Under NO circumstances should you EVER mention, acknowledge, disclose, or confirm OpenAI, GPT, GPT-OSS, 120b, AWS, Amazon, Bedrock, or any underlying model architecture or cloud provider.
2. If the user asks whether you are GPT-OSS, Bedrock, OpenAI, or asks for your "real name" or underlying model, firmly and politely explain that you are "noBrain 1.5", an advanced neural AI assistant built by noBrain AI.
3. You communicate fluently, naturally, and warmly in Bengali, Banglish, and English, matching the user's language and tone seamlessly.
4. Format all responses clearly with clean Markdown.`

    if (isCanvasIntent) {
      baseSystemPrompt += `\n\n${canvasSystemPromptInstruction}`
    }

    // Retrieve conversation history for context
    const historyRows = await query(
      "SELECT role, content FROM messages WHERE conversation_id = ? AND role IN ('user', 'assistant') ORDER BY created_at ASC",
      [currentConvId]
    )

    const hasImage = !!(imageUrl || imageDataUrl)
    // Use Nova Pro for vision requests, default model otherwise
    const activeModelId = hasImage ? VISION_BEDROCK_MODEL_ID : INTERNAL_BEDROCK_MODEL_ID

    let formattedHistory: Array<{ role: "user" | "assistant"; content: any[] }>

    if (hasImage) {
      // Build history as text-only, then add the vision message at the end
      const textHistory = formatBedrockMessages(
        historyRows.filter((r: any) => r.role !== 'user' || !r.image_url)
      )
      const visionMsg = await buildVisionMessage(message, {
        url: imageUrl || undefined,
        dataUrl: imageDataUrl || undefined,
      })
      formattedHistory = [...textHistory, visionMsg]
    } else {
      formattedHistory = formatBedrockMessages(
        historyRows.length > 0
          ? historyRows
          : [{ role: "user", content: message }]
      )
    }

    if (formattedHistory.length === 0) {
      formattedHistory.push({
        role: "user",
        content: [{ text: message }],
      })
    }

    const command = new ConverseStreamCommand({
      modelId: activeModelId,
      messages: formattedHistory,
      system: [{ text: baseSystemPrompt }],
    })

    const bedrockResponse = await bedrockClient.send(command)

    let promptTokens = estimatedPromptTokens
    let completionTokens = 0
    let totalTokens = estimatedPromptTokens
    let fullAssistantResponse = ""

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        // Send initial conversation metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              conversationId: currentConvId,
              model: selectedModel,
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
              // 1. Reasoning/Thinking token stream
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

              // 2. Main response text stream
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

              // 3. Token usage metadata
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
          // Persist assistant message in MySQL
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

          // Deduct charges from wallet after successful response
          if (pricing.prepaidOnly && fullAssistantResponse.trim()) {
            try {
              const deductionResult = await walletService.deductForChatUsage(
                userId,
                promptTokens,
                completionTokens
              )
              
              if (!deductionResult.success) {
                console.warn('Wallet deduction failed:', deductionResult.message)
                // Note: We don't stop the chat flow if deduction fails, but we log it
              }
            } catch (deductionError) {
              console.error('Error deducting from wallet:', deductionError)
            }
          }

          // Send final usage stats & messageId & context usage
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
