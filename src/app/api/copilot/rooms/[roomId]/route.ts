import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getRoomById,
  updateRoom,
  deleteRoom,
  getRoomMessages,
  addMessage,
  getUserBots,
  getRoomFiles,
} from "@/lib/copilot/store"
import { executeBotTurnStream } from "@/lib/copilot/agent"
import { walletService } from "@/lib/wallet"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { roomId } = await context.params
    const room = await getRoomById(roomId, user.id)
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

    const messages = await getRoomMessages(roomId, user.id)
    const allBots = await getUserBots(user.id)
    const assignedBots = allBots.filter((b) => room.assigned_bot_ids.includes(b.id))

    const files = await getRoomFiles(roomId, user.id)

    return NextResponse.json({ room, messages, assignedBots, files })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { roomId } = await context.params
    const body = await req.json()

    const updated = await updateRoom(roomId, user.id, body)
    return NextResponse.json({ room: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { roomId } = await context.params
    const success = await deleteRoom(roomId, user.id)
    return NextResponse.json({ success })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { roomId } = await context.params
    const { message, imageUrl } = await req.json()
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    const room = await getRoomById(roomId, user.id)
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

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

    const allBots = await getUserBots(user.id)
    const assignedBots = allBots.filter((b) => room.assigned_bot_ids.includes(b.id))

    // 1. Post User message to room
    const userMsg = await addMessage(user.id, {
      room_id: roomId,
      sender_name: user.name || "You",
      role: "user",
      content: message.trim(),
      image_url: imageUrl || null,
    })

    if (assignedBots.length === 0) {
      return NextResponse.json({ success: true, notice: "No bots in room" })
    }

    // 2. Check for @all or explicit @username/@name mentions
    const lowerMsg = message.toLowerCase()
    const isMentionAll = lowerMsg.includes("@all") || lowerMsg.includes("@everyone")

    const mentionedBots = assignedBots.filter((b) => {
      const uTag = `@${(b.username || "").toLowerCase()}`
      const nTag = `@${b.name.toLowerCase()}`
      return (b.username && lowerMsg.includes(uTag)) || lowerMsg.includes(nTag)
    })

    // If @all is mentioned or NO specific bot is mentioned (general room chat / brainstorming / "greet each other"),
    // ALL assigned bots participate sequentially like a real human team!
    // If specific bot(s) are mentioned (@scout or @scout @abcd), only the mentioned bots participate.
    let participants: typeof assignedBots = []
    if (isMentionAll) {
      participants = assignedBots
    } else if (mentionedBots.length > 0) {
      participants = mentionedBots
    } else {
      // General squad discussion / collaborative conversation
      participants = assignedBots
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "start", userMessage: userMsg })}\n\n`)
        )

        try {
          for (const currentBot of participants) {
            const others = assignedBots.filter((b) => b.id !== currentBot.id)

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "bot_start", bot: currentBot })}\n\n`
              )
            )

            await executeBotTurnStream(
              {
                bot: currentBot,
                userId: user.id,
                userName: user.name || "You",
                prompt: message.trim(),
                imageUrl: imageUrl || null,
                roomId: room.id,
                otherBots: others,
              },
              (event) => {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ ...event, botId: currentBot.id })}\n\n`
                  )
                )
              }
            )

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "bot_done", botId: currentBot.id })}\n\n`
              )
            )
          }
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
