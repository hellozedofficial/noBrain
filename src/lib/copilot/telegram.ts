import "server-only"
import crypto from "crypto"
import { getIntegration, connectIntegration, disconnectIntegration } from "./integrations"
import {
  getUserBots,
  getUserRooms,
  createRoom,
  getRoomById,
  updateRoom,
  addMessage,
  CopilotBot,
  CopilotRoom,
} from "./store"
import { executeBotTurn } from "./agent"

export interface TelegramIntegrationMetadata {
  bot_token: string
  bot_id?: number
  bot_username: string
  bot_first_name?: string
  webhook_url?: string
  webhook_secret?: string
  webhook_registered?: boolean
  telegram_room_id?: string
  restricted_access?: boolean
  allowed_chat_ids?: string[]
  allowed_usernames?: string[]
  primary_chat_id?: string
  last_active_at?: string
  connected_at?: string
  updated_at?: string
}

/**
 * Validates a Telegram Bot Token with Telegram API getMe
 */
export async function getTelegramMe(botToken: string): Promise<{
  ok: boolean
  id?: number
  username?: string
  firstName?: string
  canJoinGroups?: boolean
  error?: string
}> {
  try {
    const cleanToken = botToken.trim()
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: "GET",
      cache: "no-store",
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || "Invalid Telegram Bot Token" }
    }
    return {
      ok: true,
      id: data.result.id,
      username: data.result.username,
      firstName: data.result.first_name,
      canJoinGroups: data.result.can_join_groups,
    }
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to reach Telegram API" }
  }
}

/**
 * Registers webhook with Telegram API
 */
export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; description?: string }> {
  try {
    const cleanToken = botToken.trim()
    const payload: any = {
      url: webhookUrl,
      allowed_updates: ["message", "edited_message", "callback_query"],
    }
    if (secretToken) {
      payload.secret_token = secretToken
    }

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return { ok: data.ok, description: data.description }
  } catch (err: any) {
    return { ok: false, description: err.message }
  }
}

/**
 * Deletes webhook from Telegram API
 */
export async function deleteTelegramWebhook(botToken: string): Promise<boolean> {
  try {
    const cleanToken = botToken.trim()
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook`, {
      method: "POST",
    })
    const data = await res.json()
    return Boolean(data.ok)
  } catch {
    return false
  }
}

/**
 * Registers Bot commands with Telegram so typing `/` in Telegram displays
 * autocomplete suggestions for all active Copilots (@ceo, @cto, @all, etc.)!
 */
export async function syncTelegramBotCommands(
  botToken: string,
  copilots: CopilotBot[]
): Promise<boolean> {
  try {
    const cleanToken = botToken.trim()
    const commands: Array<{ command: string; description: string }> = [
      { command: "start", description: "Start chat with noBrain Copilots" },
      { command: "help", description: "View commands & copilot mentions" },
      { command: "all", description: "Broadcast prompt to ALL room copilots" },
      { command: "copilots", description: "List all active copilots & roles" },
      { command: "status", description: "Check room & bot bridge status" },
    ]

    for (const b of copilots) {
      const handle = (b.username || b.name).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32)
      if (handle && !commands.some((c) => c.command === handle)) {
        const desc = `${b.name} (${b.role.slice(0, 24)})`
        commands.push({
          command: handle,
          description: desc.slice(0, 256),
        })
      }
    }

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: commands.slice(0, 100) }),
    })
    const data = await res.json()
    return Boolean(data.ok)
  } catch (err) {
    console.warn("[syncTelegramBotCommands] Warning:", err)
    return false
  }
}

/**
 * Sends a chat action (typing...) to Telegram chat
 */
export async function sendTelegramChatAction(
  botToken: string,
  chatId: string | number,
  action: "typing" | "upload_photo" = "typing"
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    })
  } catch {}
}

/**
 * Splits long message content to stay within Telegram's 4096 character limit.
 */
function chunkTelegramText(text: string, maxLen = 4000): string[] {
  if (text.length <= maxLen) return [text]
  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining)
      break
    }
    let splitIdx = remaining.lastIndexOf("\n\n", maxLen)
    if (splitIdx === -1 || splitIdx < maxLen * 0.4) {
      splitIdx = remaining.lastIndexOf("\n", maxLen)
    }
    if (splitIdx === -1 || splitIdx < maxLen * 0.4) {
      splitIdx = remaining.lastIndexOf(" ", maxLen)
    }
    if (splitIdx === -1) {
      splitIdx = maxLen
    }
    chunks.push(remaining.slice(0, splitIdx).trim())
    remaining = remaining.slice(splitIdx).trim()
  }

  return chunks
}

/**
 * Sends a formatted text message to Telegram, with clean Markdown and plain-text fallback.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  options: {
    replyToMessageId?: number
    disableWebPagePreview?: boolean
    replyMarkup?: any
  } = {}
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const cleanToken = botToken.trim()
  const chunks = chunkTelegramText(text)
  let lastResult: any = { ok: false }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const payload: any = {
      chat_id: chatId,
      text: chunk,
      parse_mode: "Markdown",
      disable_web_page_preview: options.disableWebPagePreview ?? false,
    }
    if (i === 0 && options.replyToMessageId) {
      payload.reply_to_message_id = options.replyToMessageId
    }
    if (i === chunks.length - 1 && options.replyMarkup) {
      payload.reply_markup = options.replyMarkup
    }

    try {
      let res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      let data = await res.json()

      // If Markdown parsing fails due to unescaped special characters, fall back to plain text
      if (!data.ok && data.description && data.description.includes("can't parse entities")) {
        delete payload.parse_mode
        res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        data = await res.json()
      }

      lastResult = data
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }

  return {
    ok: Boolean(lastResult.ok),
    messageId: lastResult.result?.message_id,
    error: lastResult.description,
  }
}

/**
 * Downloads a photo or file sent to Telegram and returns its direct URL
 */
export async function getTelegramFileUrl(
  botToken: string,
  fileId: string
): Promise<string | null> {
  try {
    const cleanToken = botToken.trim()
    const res = await fetch(
      `https://api.telegram.org/bot${cleanToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    )
    const data = await res.json()
    if (!data.ok || !data.result?.file_path) return null
    return `https://api.telegram.org/file/bot${cleanToken}/${data.result.file_path}`
  } catch (err) {
    console.warn("[getTelegramFileUrl] Error:", err)
    return null
  }
}

/**
 * Ensures a dedicated Telegram Room exists for the user.
 * Assigns all current copilots to this room automatically!
 */
export async function ensureTelegramRoom(
  userId: string,
  botUsername: string,
  copilots: CopilotBot[]
): Promise<CopilotRoom> {
  const rooms = await getUserRooms(userId)
  const allBotIds = copilots.map((b) => b.id)

  // 1. Look for existing Telegram room
  let telegramRoom = rooms.find(
    (r) =>
      r.name.toLowerCase().includes("telegram") ||
      (r.topic && r.topic.toLowerCase().includes("telegram"))
  )

  if (telegramRoom) {
    // Ensure all user's bots are assigned to this room
    const existingAssigned = new Set(telegramRoom.assigned_bot_ids || [])
    let changed = false
    for (const bId of allBotIds) {
      if (!existingAssigned.has(bId)) {
        existingAssigned.add(bId)
        changed = true
      }
    }
    if (changed) {
      const updated = await updateRoom(telegramRoom.id, userId, {
        assigned_bot_ids: Array.from(existingAssigned),
        topic: `Live Telegram Bot Room synced with @${botUsername}. Messages and copilot mentions sync in real time.`,
      })
      if (updated) telegramRoom = updated
    }
    return telegramRoom
  }

  // 2. Create new Telegram Bridge Room
  const chiefBotId = copilots[0]?.id || null
  const newRoom = await createRoom(userId, {
    name: "Telegram Bridge",
    topic: `Live Telegram Bot Room synced with @${botUsername}. Mention any copilot (e.g. @${
      copilots[0]?.username || copilots[0]?.name.toLowerCase() || "copilot"
    }) or @all.`,
    chief_bot_id: chiefBotId,
    is_pinned: true,
    assigned_bot_ids: allBotIds,
  })

  // Seed welcome system message
  await addMessage(userId, {
    room_id: newRoom.id,
    sender_name: "Telegram Bridge",
    role: "system",
    content: `⚡ **Telegram Bridge Activated!**\nSynced with Telegram Bot: **@${botUsername}**.\nAll ${copilots.length} copilots are present in this room. You can chat directly from Telegram on your phone or desktop, send photos, and mention specific copilots with \`@username\` or \`@all\`!`,
  })

  return newRoom
}

/**
 * Resolves which copilot(s) should respond to a Telegram message.
 * Supports /command triggers (/ceo, /cto, /scout), explicit mentions (@ceo, @scout),
 * @all mentions, or defaults to the chief copilot.
 */
export function resolveTelegramMentionedBots(
  text: string,
  assignedBots: CopilotBot[],
  botUsername: string
): {
  participants: CopilotBot[]
  cleanedPrompt: string
  isBroadcast: boolean
} {
  const lower = text.toLowerCase()
  const cleanTgBotTag = `@${botUsername.toLowerCase()}`
  let strippedText = text.replace(new RegExp(cleanTgBotTag, "gi"), "").trim()

  // 1. Check for command trigger like /ceo, /cto, /scout
  const cmdMatch = strippedText.match(/^\/([a-zA-Z0-9_]+)(?:\s+([\s\S]*))?$/)
  if (cmdMatch) {
    const cmd = cmdMatch[1].toLowerCase()
    const restPrompt = (cmdMatch[2] || "").trim()

    if (cmd === "all" || cmd === "everyone") {
      return {
        participants: assignedBots,
        cleanedPrompt: restPrompt || "Hello team! What are we working on?",
        isBroadcast: true,
      }
    }

    const matchedByCmd = assignedBots.find(
      (b) =>
        (b.username && b.username.toLowerCase() === cmd) ||
        b.name.toLowerCase().replace(/[^a-z0-9_]/g, "") === cmd
    )
    if (matchedByCmd) {
      return {
        participants: [matchedByCmd],
        cleanedPrompt: restPrompt || `Hello ${matchedByCmd.name}!`,
        isBroadcast: false,
      }
    }
  }

  // 2. Check for @all mention
  if (lower.includes("@all") || lower.includes("@everyone")) {
    return {
      participants: assignedBots,
      cleanedPrompt: strippedText,
      isBroadcast: true,
    }
  }

  // 3. Check for specific @username or @name mentions
  const mentioned = assignedBots.filter((b) => {
    const uTag = `@${(b.username || "").toLowerCase()}`
    const nTag = `@${b.name.toLowerCase()}`
    return (b.username && lower.includes(uTag)) || lower.includes(nTag)
  })

  if (mentioned.length > 0) {
    return {
      participants: mentioned,
      cleanedPrompt: strippedText,
      isBroadcast: false,
    }
  }

  // 4. Default: If no specific copilot is mentioned, chief bot (or first bot) leads
  return {
    participants: assignedBots.slice(0, 1),
    cleanedPrompt: strippedText,
    isBroadcast: false,
  }
}

