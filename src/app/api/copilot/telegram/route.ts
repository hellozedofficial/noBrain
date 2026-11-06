import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getCurrentUser } from "@/lib/auth"
import { getIntegration, connectIntegration, disconnectIntegration } from "@/lib/copilot/integrations"
import { getUserBots, getUserRooms, getRoomById } from "@/lib/copilot/store"
import {
  getTelegramMe,
  setTelegramWebhook,
  deleteTelegramWebhook,
  syncTelegramBotCommands,
  sendTelegramMessage,
  ensureTelegramRoom,
  TelegramIntegrationMetadata,
} from "@/lib/copilot/telegram"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bots = await getUserBots(user.id)
    const integration = await getIntegration(user.id, "telegram")
    const isConnected = integration?.status === "connected"
    const meta: TelegramIntegrationMetadata = integration?.metadata || {
      bot_token: "",
      bot_username: "",
    }

    let telegramRoom = null
    if (meta.telegram_room_id) {
      telegramRoom = await getRoomById(meta.telegram_room_id, user.id)
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin || "http://localhost:3000"
    const webhookUrl = `${origin}/api/copilot/telegram/webhook?uid=${user.id}`

    return NextResponse.json({
      connected: isConnected,
      botUsername: meta.bot_username || null,
      botFirstName: meta.bot_first_name || null,
      restrictedAccess: meta.restricted_access ?? true,
      allowedUsernames: meta.allowed_usernames || [],
      allowedChatIds: meta.allowed_chat_ids || [],
      primaryChatId: meta.primary_chat_id || null,
      telegramRoomId: meta.telegram_room_id || telegramRoom?.id || null,
      telegramRoomName: telegramRoom?.name || "Telegram Bridge",
      copilotCount: bots.length,
      copilots: bots.map((b) => ({
        id: b.id,
        name: b.name,
        username: b.username || b.name.toLowerCase().replace(/[^a-z0-9_]/g, ""),
        role: b.role,
        shape: b.shape,
        color: b.color,
      })),
      webhookUrl,
      lastActiveAt: meta.last_active_at || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Telegram integration status" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action = "connect", botToken, restrictedAccess, allowedUsernames, allowedChatIds } = body

    const bots = await getUserBots(user.id)
    const existing = await getIntegration(user.id, "telegram")
    const prevMeta: TelegramIntegrationMetadata = existing?.metadata || {
      bot_token: "",
      bot_username: "",
    }

    // 1. Handle Disconnect
    if (action === "disconnect") {
      const activeToken = prevMeta.bot_token
      if (activeToken) {
        await deleteTelegramWebhook(activeToken)
      }
      await disconnectIntegration(user.id, "telegram")
      return NextResponse.json({ success: true, connected: false })
    }

    // 2. Handle Connect
    if (action === "connect") {
      const tokenToUse = (botToken && botToken.trim()) || prevMeta.bot_token
      if (!tokenToUse) {
        return NextResponse.json(
          { error: "Telegram Bot Token is required. Get one from @BotFather." },
          { status: 400 }
        )
      }

      // MANDATORY VALIDATION: Minimum 1 copilot must exist
      if (bots.length === 0) {
        return NextResponse.json(
          {
            error:
              "You must create at least 1 Copilot on noBrain before connecting Telegram. Please create a Copilot from the sidebar first.",
          },
          { status: 400 }
        )
      }

      // Validate token with Telegram getMe API
      const botInfo = await getTelegramMe(tokenToUse)
      if (!botInfo.ok || !botInfo.username) {
        return NextResponse.json(
          { error: botInfo.error || "Invalid Telegram Bot Token. Please check and try again." },
          { status: 400 }
        )
      }

      // Automatic Room Creation: Ensure dedicated Telegram room exists with all copilots
      const telegramRoom = await ensureTelegramRoom(user.id, botInfo.username, bots)

      // Register Webhook with Telegram
      const host = req.headers.get("host") || "localhost:3000"
      const protocol = host.includes("localhost") ? "http" : "https"
      const origin = `${protocol}://${host}`
      const webhookUrl = `${origin}/api/copilot/telegram/webhook?uid=${user.id}`
      const secretToken = crypto.randomBytes(16).toString("hex")

      // Only attempt setWebhook if not localhost or if using tunnel / production domain
      let webhookSuccess = true
      if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
        const whRes = await setTelegramWebhook(tokenToUse, webhookUrl, secretToken)
        webhookSuccess = whRes.ok
      }

      // Sync Bot commands (/ceo, /cto, /all, etc.) with Telegram menu
      await syncTelegramBotCommands(tokenToUse, bots)

      // Normalize allowed usernames and chat IDs
      const cleanUsernames = Array.isArray(allowedUsernames)
        ? allowedUsernames.map((u: string) => u.replace(/^@/, "").trim().toLowerCase()).filter(Boolean)
        : prevMeta.allowed_usernames || []
      const cleanChatIds = Array.isArray(allowedChatIds)
        ? allowedChatIds.map((c: any) => String(c).trim()).filter(Boolean)
        : prevMeta.allowed_chat_ids || []

      const newMeta: TelegramIntegrationMetadata = {
        ...prevMeta,
        bot_token: tokenToUse,
        bot_id: botInfo.id,
        bot_username: botInfo.username,
        bot_first_name: botInfo.firstName,
        webhook_url: webhookUrl,
        webhook_secret: secretToken,
        webhook_registered: webhookSuccess,
        telegram_room_id: telegramRoom.id,
        restricted_access: restrictedAccess ?? prevMeta.restricted_access ?? true,
        allowed_usernames: cleanUsernames,
        allowed_chat_ids: cleanChatIds,
        connected_at: prevMeta.connected_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const saved = await connectIntegration(
        user.id,
        "telegram",
        `@${botInfo.username}`,
        newMeta
      )

      return NextResponse.json({
        success: true,
        connected: true,
        botUsername: botInfo.username,
        botFirstName: botInfo.firstName,
        telegramRoomId: telegramRoom.id,
        telegramRoomName: telegramRoom.name,
        assignedBotsCount: bots.length,
        webhookRegistered: webhookSuccess,
        integration: saved,
      })
    }

    // 3. Handle Update Security & Access Settings
    if (action === "update_settings") {
      const cleanUsernames = Array.isArray(allowedUsernames)
        ? allowedUsernames.map((u: string) => u.replace(/^@/, "").trim().toLowerCase()).filter(Boolean)
        : prevMeta.allowed_usernames || []
      const cleanChatIds = Array.isArray(allowedChatIds)
        ? allowedChatIds.map((c: any) => String(c).trim()).filter(Boolean)
        : prevMeta.allowed_chat_ids || []

      const updatedMeta: TelegramIntegrationMetadata = {
        ...prevMeta,
        restricted_access: Boolean(restrictedAccess),
        allowed_usernames: cleanUsernames,
        allowed_chat_ids: cleanChatIds,
        updated_at: new Date().toISOString(),
      }

      await connectIntegration(
        user.id,
        "telegram",
        `@${prevMeta.bot_username || "Telegram"}`,
        updatedMeta
      )

      return NextResponse.json({ success: true, updated: true, settings: updatedMeta })
    }

    // 4. Handle Test Message
    if (action === "test_message") {
      const activeToken = prevMeta.bot_token
      const targetChat = body.chatId || prevMeta.primary_chat_id || prevMeta.allowed_chat_ids?.[0]

      if (!activeToken) {
        return NextResponse.json({ error: "Telegram is not connected yet" }, { status: 400 })
      }
      if (!targetChat) {
        return NextResponse.json(
          {
            error:
              "Please send a message to @" +
              prevMeta.bot_username +
              " on Telegram first, or specify your Telegram Chat ID.",
          },
          { status: 400 }
        )
      }

      const testMsg = `🚀 *noBrain Copilot Telegram Bridge Active!*\n\nConnected to: *${
        prevMeta.bot_username
      }*\nAssigned Room: *Telegram Bridge*\nAvailable Copilots: ${bots
        .map((b) => `@${b.username || b.name.toLowerCase()}`)
        .join(", ")}\n\nYou can chat with text or photos right here! Type \`/all\` to message the entire squad, or \`@handle\` to direct a task.`

      const sendRes = await sendTelegramMessage(activeToken, targetChat, testMsg)
      if (!sendRes.ok) {
        return NextResponse.json(
          { error: sendRes.error || "Failed to send Telegram test message" },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, sent: true })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: any) {
    console.error("[POST /api/copilot/telegram] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to configure Telegram" },
      { status: 500 }
    )
  }
}
