import { NextResponse } from "next/server"
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime"
import { validateApiKey } from "@/lib/apiKey"
import { walletService } from "@/lib/wallet"

const INTERNAL_BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-120b-1:0"
const PUBLIC_MODEL_NAME = "nobrain-1.5"

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

/**
 * POST /api/v1/chat
 *
 * Public chat API — mirrors the ZED API docs format.
 *
 * Request body:
 *   message        string   REQUIRED
 *   history        array    OPTIONAL  [{role:"user"|"assistant", content:"..."}]
 *   system_prompt  string   OPTIONAL
 *
 * Headers:
 *   Authorization: Bearer nbr_<key>
 *   Origin / Referer  (used for domain-protection check)
 *
 * Response:
 *   { success: true, response: string, model: string, usage: { input_tokens, output_tokens } }
 */
export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization")
  const originHeader =
    req.headers.get("origin") || req.headers.get("referer") || null

  const validation = await validateApiKey(authHeader, originHeader)
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 401 }
    )
  }

  const userId = validation.userId!

  // ── Wallet check ─────────────────────────────────────────────────────────
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
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    )
  }

  const message: string = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json(
      { success: false, error: "message is required." },
      { status: 400 }
    )
  }

  const rawHistory: Array<{ role: string; content: string }> = Array.isArray(body.history)
    ? body.history
    : []
  const systemPrompt: string =
    typeof body.system_prompt === "string"
      ? body.system_prompt
      : "You are noBrain 1.5, a helpful AI assistant."

  // ── Build Bedrock messages ────────────────────────────────────────────────
  const messages: Array<{ role: "user" | "assistant"; content: Array<{ text: string }> }> = []

  for (const h of rawHistory) {
    const text = (h.content || "").trim()
    if (!text) continue
    const role: "user" | "assistant" = h.role === "assistant" ? "assistant" : "user"
    const last = messages[messages.length - 1]
    if (last && last.role === role) {
      last.content[0].text += `\n\n${text}`
    } else {
      messages.push({ role, content: [{ text }] })
    }
  }

  // Ensure conversation starts with user
  if (messages.length === 0 || messages[messages.length - 1].role === "assistant") {
    messages.push({ role: "user", content: [{ text: message }] })
  } else if (messages[messages.length - 1].role === "user") {
    messages[messages.length - 1].content[0].text += `\n\n${message}`
  }

  // ── Call Bedrock ──────────────────────────────────────────────────────────
  try {
    const command = new ConverseCommand({
      modelId: INTERNAL_BEDROCK_MODEL_ID,
      messages,
      system: [{ text: systemPrompt }],
    })

    const result = await bedrockClient.send(command)

    const responseText =
      (result.output?.message?.content?.[0] as any)?.text ?? ""
    const inputTokens = result.usage?.inputTokens ?? 0
    const outputTokens = result.usage?.outputTokens ?? 0

    // ── Deduct wallet ────────────────────────────────────────────────────────
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
    console.error("[v1/chat] Bedrock error:", err)
    return NextResponse.json(
      { success: false, error: "AI service error. Please try again." },
      { status: 500 }
    )
  }
}
