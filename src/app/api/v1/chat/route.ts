import { NextResponse } from "next/server"
import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime"
import { validateApiKey } from "@/lib/apiKey"
import { walletService } from "@/lib/wallet"

// Text model for normal chat
const CHAT_MODEL_ID = process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-120b-1:0"
// Vision model for image understanding — Amazon Nova Pro
const VISION_MODEL_ID = "amazon.nova-pro-v1:0"
const PUBLIC_MODEL_NAME = "nobrain-1.5"

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

/**
 * Fetch an image URL and return it as a Bedrock vision image block.
 * Nova Pro requires bytes — not URLs.
 */
async function urlToImageBlock(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") || "image/jpeg"
    const buf = Buffer.from(await res.arrayBuffer())
    const fmt = contentType.includes("png")
      ? "png"
      : contentType.includes("gif")
      ? "gif"
      : contentType.includes("webp")
      ? "webp"
      : "jpeg"
    return { image: { format: fmt, source: { bytes: buf } } }
  } catch {
    return null
  }
}

/**
 * POST /api/v1/chat
 *
 * Request body:
 *   message       string          REQUIRED  User message text
 *   image_urls    string[]        OPTIONAL  Public image URLs for vision analysis
 *   history       array           OPTIONAL  [{role:"user"|"assistant", content:"..."}]
 *   system_prompt string          OPTIONAL  Custom system prompt
 *
 * Headers:
 *   Authorization: Bearer nbr_<key>
 *   Origin / Referer  (domain-protection check)
 *
 * Response:
 *   { success: true, response: string, model: string, usage: { input_tokens, output_tokens } }
 */
export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization")
  const originHeader = req.headers.get("origin") || req.headers.get("referer") || null

  const validation = await validateApiKey(authHeader, originHeader)
  if (!validation.valid) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 401 })
  }
  const userId = validation.userId!

  // ── Wallet check ──────────────────────────────────────────────────────────
  const pricing = walletService.getPricingConfig()
  if (pricing.prepaidOnly) {
    const balance = await walletService.getBalance(userId)
    const minCost =
      (200 / 1_000_000) * pricing.inputPerMillionPrice +
      (200 / 1_000_000) * pricing.outputPerMillionPrice
    if (balance < minCost) {
      return NextResponse.json(
        { success: false, error: "Insufficient quota. Please recharge your wallet." },
        { status: 402 }
      )
    }
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const message: string = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json({ success: false, error: "message is required." }, { status: 400 })
  }

  // image_urls: string[] — optional, triggers Nova Pro vision model
  const imageUrls: string[] = Array.isArray(body.image_urls)
    ? body.image_urls.filter((u: any) => typeof u === "string" && u.trim())
    : typeof body.image_url === "string" && body.image_url.trim()
    ? [body.image_url.trim()]  // also accept singular image_url for convenience
    : []

  const rawHistory: Array<{ role: string; content: string }> = Array.isArray(body.history)
    ? body.history
    : []

  const systemPrompt: string =
    typeof body.system_prompt === "string"
      ? body.system_prompt
      : "You are noBrain 1.5, a helpful AI assistant."

  // ── Build Bedrock messages ────────────────────────────────────────────────
  // content blocks can be text OR image, so use `any[]`
  const messages: Array<{ role: "user" | "assistant"; content: any[] }> = []

  // History (text-only)
  for (const h of rawHistory) {
    const text = (h.content || "").trim()
    if (!text) continue
    const role: "user" | "assistant" = h.role === "assistant" ? "assistant" : "user"
    const last = messages[messages.length - 1]
    if (last && last.role === role) {
      // merge consecutive same-role turns
      const lastBlock = last.content[last.content.length - 1]
      if (lastBlock?.text !== undefined) {
        lastBlock.text += `\n\n${text}`
      } else {
        last.content.push({ text })
      }
    } else {
      messages.push({ role, content: [{ text }] })
    }
  }

  // Current user turn — may include image blocks
  if (imageUrls.length > 0) {
    // Fetch all images concurrently
    const imageBlocks = (await Promise.all(imageUrls.map(urlToImageBlock))).filter(Boolean)

    const userContent: any[] = [
      ...imageBlocks,
      { text: message || "What is in this image?" },
    ]

    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      // Append to last user turn
      messages[messages.length - 1].content.push(...userContent)
    } else {
      messages.push({ role: "user", content: userContent })
    }
  } else {
    // Text-only turn
    if (messages.length === 0 || messages[messages.length - 1].role === "assistant") {
      messages.push({ role: "user", content: [{ text: message }] })
    } else if (messages[messages.length - 1].role === "user") {
      messages[messages.length - 1].content.push({ text: message })
    }
  }

  // Pick model — Nova Pro for vision, default for text
  const modelId = imageUrls.length > 0 ? VISION_MODEL_ID : CHAT_MODEL_ID

  // ── Call Bedrock (streaming) ───────────────────────────────────────────────
  try {
    const command = new ConverseStreamCommand({
      modelId,
      messages,
      system: [{ text: systemPrompt }],
    })

    const result = await bedrockClient.send(command)

    let fullText = ""
    let inputTokens = 0
    let outputTokens = 0

    if (result.stream) {
      for await (const chunk of result.stream) {
        const textDelta = chunk.contentBlockDelta?.delta?.text
        if (textDelta) fullText += textDelta

        if (chunk.metadata?.usage) {
          inputTokens = chunk.metadata.usage.inputTokens ?? inputTokens
          outputTokens = chunk.metadata.usage.outputTokens ?? outputTokens
        }
      }
    }

    // Fallback token estimate
    if (outputTokens === 0 && fullText.length > 0) {
      outputTokens = Math.ceil(fullText.length / 4)
    }

    // Strip <think>...</think> reasoning blocks
    const responseText = fullText.replace(/<think>[\s\S]*?<\/think>/g, "").trim()

    // ── Deduct wallet ─────────────────────────────────────────────────────
    if (pricing.prepaidOnly && responseText) {
      await walletService.deductForChatUsage(userId, inputTokens, outputTokens).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      model: PUBLIC_MODEL_NAME,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    })
  } catch (err: any) {
    console.error("[v1/chat] Bedrock error:", err?.message, err?.response?.data)
    return NextResponse.json(
      { success: false, error: "AI service error. Please try again." },
      { status: 500 }
    )
  }
}
