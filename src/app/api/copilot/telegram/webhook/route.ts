import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getIntegration, connectIntegration } from "@/lib/copilot/integrations"
import {
  getUserBots,
  getRoomById,
  addMessage,
  CopilotBot,
} from "@/lib/copilot/store"
import { executeBotTurn } from "@/lib/copilot/agent"
import {
  sendTelegramMessage,
  sendTelegramChatAction,
  getTelegramFileUrl,
  ensureTelegramRoom,
  resolveTelegramMentionedBots,
  TelegramIntegrationMetadata,
} from "@/lib/copilot/telegram"

export async function GET(req: NextRequest) {
  return NextResponse.json({
    service: "noBrain Copilot • Telegram Bridge Webhook",
    status: "active",
    protocol: "Telegram Bot API (Long polling / Webhook)",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json()
    const update = rawBody

    const message = update?.message || update?.edited_message
    if (!message) {
      return NextResponse.json({ ok: true, notice: "No message in update" })
    }

    const chatId = message.chat?.id
    const fromUser = message.from
    const fromId = fromUser?.id ? String(fromUser.id) : ""
    const fromUsername = fromUser?.username ? fromUser.username.toLowerCase() : ""
    const fromName =
      fromUser?.first_name || fromUser?.username || "Telegram User"

    if (!chatId) {
      return NextResponse.json({ ok: true, notice: "Missing chatId" })
    }

    // Identify user from query param `?uid=...` or find matching Telegram integration
    const { searchParams } = new URL(req.url)
    let targetUserId = searchParams.get("uid")

    if (!targetUserId) {
      const rows = await query<any>(
        "SELECT user_id FROM copilot_integrations WHERE provider = 'telegram' AND status = 'connected' LIMIT 1"
      )
      if (rows.length > 0) {
        targetUserId = rows[0].user_id
      }
    }

    if (!targetUserId) {
      console.warn("[Telegram Webhook] No user found for incoming update.")
      return NextResponse.json({ ok: true, error: "No associated noBrain user found" })
    }

    const integration = await getIntegration(targetUserId, "telegram")
    if (!integration || integration.status !== "connected") {
      return NextResponse.json({ ok: true, error: "Telegram is not connected for this user" })
    }

    const meta: TelegramIntegrationMetadata = integration.metadata || {
      bot_token: "",
      bot_username: "",
    }
    const botToken = meta.bot_token
    if (!botToken) {
      return NextResponse.json({ ok: true, error: "Missing bot_token in metadata" })
    }

    // -------------------------------------------------------------
    // RESTRICTED ACCESS & SECURITY ENFORCEMENT
    // -------------------------------------------------------------
    const isRestricted = meta.restricted_access !== false
    const allowedChatIds = meta.allowed_chat_ids || []
    const allowedUsernames = (meta.allowed_usernames || []).map((u) => u.toLowerCase().replace(/^@/, ""))

    let isAuthorized = false

    if (!isRestricted) {
      isAuthorized = true
    } else {
      // Check if ID or username matches
      if (
        allowedChatIds.includes(String(chatId)) ||
        allowedChatIds.includes(fromId) ||
        (fromUsername && allowedUsernames.includes(fromUsername))
      ) {
        isAuthorized = true
      } else if (allowedChatIds.length === 0 && allowedUsernames.length === 0) {
        // Auto-bind first user as authorized owner
        isAuthorized = true
        allowedChatIds.push(String(chatId))
        if (fromUsername) allowedUsernames.push(fromUsername)
      }
    }

    if (!isAuthorized) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `🔒 *Restricted Access Mode*\n\nYour Telegram ID: \`${fromId}\` (@${fromUsername || "none"})\n\nThis noBrain Copilot is restricted to authorized team members to protect platform wallet balance. Please ask your workspace owner to add your Telegram ID or Username under **Workspace Integrations > Telegram**.`,
        { replyToMessageId: message.message_id }
      )
      return NextResponse.json({ ok: true, notice: "Access denied by restricted access policy" })
    }

    // Update primary chat ID & last active timestamp in metadata
    meta.primary_chat_id = String(chatId)
    meta.last_active_at = new Date().toISOString()
    if (!meta.allowed_chat_ids?.includes(String(chatId))) {
      meta.allowed_chat_ids = [...(meta.allowed_chat_ids || []), String(chatId)]
    }
    await connectIntegration(
      targetUserId,
      "telegram",
      integration.account_email || `@${meta.bot_username}`,
      meta
    )

    // -------------------------------------------------------------
    // FETCH USER COPILOTS & ENSURE TELEGRAM ROOM
    // -------------------------------------------------------------
    const bots = await getUserBots(targetUserId)
    if (bots.length === 0) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "⚠️ *No Copilots Found*\n\nYou haven't created any AI Copilots in noBrain yet. Please open your noBrain workspace, create at least 1 Copilot (e.g. CEO, CTO, Scout), and return here!",
        { replyToMessageId: message.message_id }
      )
      return NextResponse.json({ ok: true, notice: "No bots available" })
    }

    let room = meta.telegram_room_id
      ? await getRoomById(meta.telegram_room_id, targetUserId)
      : null

    if (!room) {
      room = await ensureTelegramRoom(targetUserId, meta.bot_username, bots)
      meta.telegram_room_id = room.id
      await connectIntegration(
        targetUserId,
        "telegram",
        integration.account_email || `@${meta.bot_username}`,
        meta
      )
    }

    // -------------------------------------------------------------
    // HANDLE SPECIAL COMMANDS (/start, /help, /copilots, /status)
    // -------------------------------------------------------------
    const rawText: string = (message.text || message.caption || "").trim()

    if (rawText === "/start") {
      const welcomeMsg =
        `👋 *Welcome to noBrain Copilot!* (@${meta.bot_username})\n\n` +
        `This chat is directly connected to your workspace room: **${room.name}**.\n\n` +
        `🤖 *Available Copilots in your room:*\n` +
        bots
          .map(
            (b) =>
              `• **${b.name}** (@${b.username || b.name.toLowerCase()}): _${b.role}_`
          )
          .join("\n") +
        `\n\n💡 *How to use:*\n` +
        `• Type \`@handle <task>\` or \`/<handle> <task>\` to assign a task to a specific copilot (e.g. \`@${
          bots[0]?.username || "copilot"
        } make a roadmap\`).\n` +
        `• Type \`/all <task>\` or \`@all\` to brainstorm with your entire copilot squad.\n` +
        `• Send photos with captions for multimodal vision perception!\n` +
        `• All messages and files are synced live to your noBrain workspace.`

      await sendTelegramMessage(botToken, chatId, welcomeMsg, {
        replyToMessageId: message.message_id,
      })
      return NextResponse.json({ ok: true, handled: "start" })
    }

    if (rawText === "/help" || rawText === "/copilots") {
      const helpMsg =
        `📋 *noBrain Copilot Squad Roster*\n\n` +
        bots
          .map(
            (b) =>
              `• **${b.name}** (\`@${b.username || b.name.toLowerCase()}\`)\n  Role: ${b.role}\n  Command: \`/${b.username || b.name.toLowerCase()}\``
          )
          .join("\n\n") +
        `\n\n✨ *Tips:*\n` +
        `• Direct task: \`@${bots[0]?.username || "copilot"} analyze this file\`\n` +
        `• Broadcast to all: \`/all plan our next release\`\n` +
        `• You can also attach photos or documents!`

      await sendTelegramMessage(botToken, chatId, helpMsg, {
        replyToMessageId: message.message_id,
      })
      return NextResponse.json({ ok: true, handled: "help" })
    }

    if (rawText === "/status") {
      await sendTelegramMessage(
        botToken,
        chatId,
        `🟢 *Bridge Online*\n\nWorkspace Room: **${room.name}**\nCopilots Active: **${bots.length}**\nRestricted Access: **${
          isRestricted ? "Enabled (Secure)" : "Open"
        }**\nYour Chat ID: \`${chatId}\``,
        { replyToMessageId: message.message_id }
      )
      return NextResponse.json({ ok: true, handled: "status" })
    }

    if (!rawText && !message.photo) {
      return NextResponse.json({ ok: true, notice: "Empty message ignored" })
    }

    // -------------------------------------------------------------
    // EXTRACT PHOTO (IF SENT) FOR MULTIMODAL PERCEPTION
    // -------------------------------------------------------------
    let imageUrl: string | null = null
    if (Array.isArray(message.photo) && message.photo.length > 0) {
      await sendTelegramChatAction(botToken, chatId, "upload_photo")
      const highestRes = message.photo[message.photo.length - 1]
      if (highestRes.file_id) {
        imageUrl = await getTelegramFileUrl(botToken, highestRes.file_id)
      }
    }

    // -------------------------------------------------------------
    // POST USER MESSAGE INTO WORKSPACE TELEGRAM ROOM
    // -------------------------------------------------------------
    await sendTelegramChatAction(botToken, chatId, "typing")

    const userPrompt = rawText || "(Shared a photo for visual analysis)"
    await addMessage(targetUserId, {
      room_id: room.id,
      sender_name: `${fromName} (Telegram)`,
      role: "user",
      content: userPrompt,
      image_url: imageUrl,
    })

    // -------------------------------------------------------------
    // RESOLVE MENTIONED COPILOT(S)
    // -------------------------------------------------------------
    const { participants, cleanedPrompt } = resolveTelegramMentionedBots(
      userPrompt,
      bots,
      meta.bot_username
    )

    // -------------------------------------------------------------
    // EXECUTE AGENT TURN FOR EACH PARTICIPANT COPILOT
    // -------------------------------------------------------------
    for (const bot of participants) {
      await sendTelegramChatAction(botToken, chatId, "typing")

      const others = bots.filter((b) => b.id !== bot.id)
      const botResult = await executeBotTurn({
        bot,
        userId: targetUserId,
        userName: fromName,
        prompt: cleanedPrompt,
        imageUrl,
        roomId: room.id,
        otherBots: others,
      })

      const reply = botResult.reply || "I have received and processed your request."
      const formattedTelegramMsg =
        `🤖 *${bot.name}* (@${bot.username || bot.name.toLowerCase()}):\n\n${reply}`

      await sendTelegramMessage(botToken, chatId, formattedTelegramMsg, {
        replyToMessageId: message.message_id,
      })
    }

    return NextResponse.json({
      ok: true,
      processed: true,
      participantsCount: participants.length,
    })
  } catch (error: any) {
    console.error("[Telegram Webhook Error]:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

