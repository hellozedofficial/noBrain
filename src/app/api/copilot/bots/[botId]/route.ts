import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getBotById,
  updateBot,
  deleteBot,
  getDirectBotMessages,
  getBotFiles,
  addMessage,
} from "@/lib/copilot/store"
import { executeBotTurnStream } from "@/lib/copilot/agent"
import { walletService } from "@/lib/wallet"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ botId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { botId } = await context.params
    const bot = await getBotById(botId, user.id)
    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 })

    const messages = await getDirectBotMessages(botId, user.id)
    const files = await getBotFiles(botId, user.id)

    return NextResponse.json({ bot, messages, files })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ botId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { botId } = await context.params
    const body = await req.json()

    const updated = await updateBot(botId, user.id, body)
    return NextResponse.json({ bot: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ botId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { botId } = await context.params
    const success = await deleteBot(botId, user.id)
    return NextResponse.json({ success })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ botId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { botId } = await context.params
    const { message, imageUrl } = await req.json()
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    const bot = await getBotById(botId, user.id)
    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 })

    // Wallet balance pre-check for prepaid platform
    const pricing = walletService.getPricingConfig()
    if (pricing.prepaidOnly) {
      const balance = await walletService.getBalance(user.id)
      const minCost = (100 / 1000000) * pricing.inputPerMillionPrice + (100 / 1000000) * pricing.outputPerMillionPrice
      if (balance < minCost) {
        return NextResponse.json(
          {
            error: "Insufficient balance in your wallet. Please recharge to continue using Copilot.",
            code: "INSUFFICIENT_BALANCE",
            requiredAmount: minCost,
            currentBalance: balance,
          },
          { status: 402 }
        )
      }
    }

    // Save user message with optional image
    const userMsg = await addMessage(user.id, {
      bot_id: bot.id,
      sender_name: user.name || "You",
      role: "user",
      content: message.trim(),
      image_url: imageUrl || null,
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial user message confirmation
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "start", userMessage: userMsg })}\n\n`)
        )

        try {
          await executeBotTurnStream(
            {
              bot,
              userId: user.id,
              userName: user.name || "You",
              prompt: message.trim(),
              imageUrl: imageUrl || null,
            },
            (event) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            }
          )
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`)
          )
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
