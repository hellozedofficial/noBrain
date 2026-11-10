import "server-only"
import { query, execute } from "@/lib/db"
import { CopilotBot, CopilotRoom, CopilotMessage, CopilotFile } from "./types"
import { RobotHeadShape } from "robot-heads"

import crypto from "crypto"

export * from "./types"

export function generate32CharId(): string {
  return crypto.randomBytes(16).toString("hex")
}

export async function getUserBots(userId: string): Promise<CopilotBot[]> {
  const rows = await query<any>(
    "SELECT * FROM copilot_bots WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC",
    [userId]
  )
  return rows.map(formatBotRow)
}

export async function getBotById(botId: string, userId: string): Promise<CopilotBot | null> {
  const rows = await query<any>(
    "SELECT * FROM copilot_bots WHERE id = ? AND user_id = ?",
    [botId, userId]
  )
  if (!rows.length) return null
  return formatBotRow(rows[0])
}

export async function createBot(
  userId: string,
  params: {
    name: string
    username?: string
    role?: string
    shape?: RobotHeadShape
    color?: string
    trim_color?: string
    screen_color?: string
    model?: string
  }
): Promise<CopilotBot> {
  const id = generate32CharId()
  const name = params.name.trim() || "Copilot"
  let username = params.username ? params.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "") : ""
  if (!username) {
    username = name.toLowerCase().replace(/[^a-z0-9_]/g, "")
  }
  if (!username) {
    username = "copilot_" + id.slice(0, 6)
  }

  // Ensure username is not duplicate for this user
  const existing = await query("SELECT id FROM copilot_bots WHERE user_id = ? AND username = ?", [userId, username])
  if (existing.length > 0) {
    username = `${username}_${Math.floor(Math.random() * 899 + 100)}`
  }

  const role = params.role?.trim() || "AI Specialist"
  const shape = params.shape || "rectangle"
  const color = params.color || "#2b49a3"
  const trimColor = params.trim_color || "#93a6c8"
  const screenColor = params.screen_color || "#e8f2ff"
  const model = params.model || null
  const rules = JSON.stringify({
    files: "allow",
    shell: "allow",
    browse: "allow",
    routines: "allow",
    manage: "ask",
  })
  const memory = ""
  const openItems = JSON.stringify([])

  await execute(
    `INSERT INTO copilot_bots 
     (id, user_id, name, username, role, shape, color, trim_color, screen_color, model, status, rules, memory, open_items)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?, ?, ?)`,
    [id, userId, name, username, role, shape, color, trimColor, screenColor, model, rules, memory, openItems]
  )

  // Seed default workspace file
  await saveBotFile(
    id,
    userId,
    "README.md",
    `# ${name} Workspace\n**Role:** ${role}\n**Created:** ${new Date().toLocaleDateString()}\n\nThis is my dedicated workspace. I can save code, notes, and documents here.`
  )

  // Seed greeting message
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const greeting = `Hello! I'm ${name}, your AI Copilot powered by noBrain 1.5. I have my own workspace, memory, and tools ready. How can I help you today?`

  await execute(
    `INSERT INTO copilot_messages (id, user_id, bot_id, sender_name, role, content) VALUES (?, ?, ?, ?, 'assistant', ?)`,
    [msgId, userId, id, name, greeting]
  )

  return (await getBotById(id, userId))!
}

export async function updateBot(
  botId: string,
  userId: string,
  updates: Partial<CopilotBot>
): Promise<CopilotBot | null> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push("name = ?")
    values.push(updates.name)
  }
  if (updates.username !== undefined) {
    let un = updates.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "")
    if (un) {
      fields.push("username = ?")
      values.push(un)
    }
  }
  if (updates.role !== undefined) {
    fields.push("role = ?")
    values.push(updates.role)
  }
  if (updates.shape !== undefined) {
    fields.push("shape = ?")
    values.push(updates.shape)
  }
  if (updates.color !== undefined) {
    fields.push("color = ?")
    values.push(updates.color)
  }
  if (updates.trim_color !== undefined) {
    fields.push("trim_color = ?")
    values.push(updates.trim_color)
  }
  if (updates.screen_color !== undefined) {
    fields.push("screen_color = ?")
    values.push(updates.screen_color)
  }
  if (updates.model !== undefined) {
    fields.push("model = ?")
    values.push(updates.model)
  }
  if (updates.status !== undefined) {
    fields.push("status = ?")
    values.push(updates.status)
  }
  if (updates.rules !== undefined) {
    fields.push("rules = ?")
    values.push(JSON.stringify(updates.rules))
  }
  if (updates.memory !== undefined) {
    fields.push("memory = ?")
    values.push(updates.memory)
  }
  if (updates.open_items !== undefined) {
    fields.push("open_items = ?")
    values.push(JSON.stringify(updates.open_items))
  }
  if (updates.is_pinned === true) {
    await execute("UPDATE copilot_bots SET is_pinned = FALSE WHERE user_id = ?", [userId])
    await execute("UPDATE copilot_rooms SET is_pinned = FALSE WHERE user_id = ?", [userId])
    fields.push("is_pinned = TRUE")
  } else if (updates.is_pinned === false) {
    fields.push("is_pinned = FALSE")
  }
  if (updates.cleared_at !== undefined) {
    fields.push("cleared_at = ?")
    values.push(updates.cleared_at ? new Date(updates.cleared_at) : null)
  }
  if (updates.memory !== undefined) {
    fields.push("memory = ?")
    values.push(updates.memory)
  }

  if (fields.length === 0) return await getBotById(botId, userId)

  values.push(botId, userId)
  await execute(
    `UPDATE copilot_bots SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    values
  )

  return await getBotById(botId, userId)
}

export async function deleteBot(botId: string, userId: string): Promise<boolean> {
  await execute("DELETE FROM copilot_messages WHERE bot_id = ? AND user_id = ?", [botId, userId])
  await execute("DELETE FROM copilot_files WHERE bot_id = ? AND user_id = ?", [botId, userId])
  const res = await execute("DELETE FROM copilot_bots WHERE id = ? AND user_id = ?", [botId, userId])
  return res.affectedRows > 0
}

// ----------------- ROOMS -----------------

function formatRoomRow(r: any): CopilotRoom {
  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    topic: r.topic || "",
    avatar_url: r.avatar_url || null,
    chief_bot_id: r.chief_bot_id || null,
    is_pinned: Boolean(r.is_pinned),
    cleared_at: r.cleared_at ? new Date(r.cleared_at).toISOString() : null,
    assigned_bot_ids: typeof r.assigned_bot_ids === "string" ? JSON.parse(r.assigned_bot_ids) : r.assigned_bot_ids || [],
    memory: r.memory || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

export async function getUserRooms(userId: string): Promise<CopilotRoom[]> {
  const rows = await query<any>(
    "SELECT * FROM copilot_rooms WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC",
    [userId]
  )
  return rows.map(formatRoomRow)
}

export async function getRoomById(roomId: string, userId: string): Promise<CopilotRoom | null> {
  const rows = await query<any>(
    "SELECT * FROM copilot_rooms WHERE id = ? AND user_id = ?",
    [roomId, userId]
  )
  if (!rows.length) return null
  return formatRoomRow(rows[0])
}

export async function createRoom(
  userId: string,
  params: {
    name: string
    topic?: string
    avatar_url?: string | null
    chief_bot_id?: string | null
    is_pinned?: boolean
    assigned_bot_ids: string[]
  }
): Promise<CopilotRoom> {
  const id = generate32CharId()
  const name = params.name.trim() || "Project Room"
  const topic = params.topic?.trim() || "Team collaboration room"
  const avatarUrl = params.avatar_url || null
  const chiefBotId = params.chief_bot_id || null
  const isPinned = Boolean(params.is_pinned)
  const assigned = JSON.stringify(params.assigned_bot_ids || [])

  if (isPinned) {
    await execute("UPDATE copilot_rooms SET is_pinned = FALSE WHERE user_id = ?", [userId])
    await execute("UPDATE copilot_bots SET is_pinned = FALSE WHERE user_id = ?", [userId])
  }

  await execute(
    `INSERT INTO copilot_rooms (id, user_id, name, topic, avatar_url, chief_bot_id, is_pinned, assigned_bot_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name, topic, avatarUrl, chiefBotId, isPinned, assigned]
  )

  // Seed system notification message
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await execute(
    `INSERT INTO copilot_messages (id, user_id, room_id, sender_name, role, content) 
     VALUES (?, ?, ?, 'System', 'system', ?)`,
    [
      msgId,
      userId,
      id,
      `Welcome to **${name}**! Mention any copilot with **@Name** to give them specific tasks, or write to the room to brainstorm together.`,
    ]
  )

  // Seed squad workspace README.md
  await saveRoomFile(
    id,
    null,
    userId,
    "README.md",
    `# ${name} Squad Workspace\n**Topic:** ${topic}\n**Created:** ${new Date().toLocaleDateString()}\n\nWelcome to our team workspace! All plans, task lists, and specifications created by the squad will be updated right here.`
  )

  return (await getRoomById(id, userId))!
}

export async function updateRoom(
  roomId: string,
  userId: string,
  updates: Partial<CopilotRoom>
): Promise<CopilotRoom | null> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.is_pinned === true) {
    await execute("UPDATE copilot_rooms SET is_pinned = FALSE WHERE user_id = ?", [userId])
    await execute("UPDATE copilot_bots SET is_pinned = FALSE WHERE user_id = ?", [userId])
    fields.push("is_pinned = TRUE")
  } else if (updates.is_pinned === false) {
    fields.push("is_pinned = FALSE")
  }

  if (updates.name !== undefined) {
    fields.push("name = ?")
    values.push(updates.name)
  }
  if (updates.topic !== undefined) {
    fields.push("topic = ?")
    values.push(updates.topic)
  }
  if (updates.avatar_url !== undefined) {
    fields.push("avatar_url = ?")
    values.push(updates.avatar_url)
  }
  if (updates.chief_bot_id !== undefined) {
    fields.push("chief_bot_id = ?")
    values.push(updates.chief_bot_id)
  }
  if (updates.assigned_bot_ids !== undefined) {
    fields.push("assigned_bot_ids = ?")
    values.push(JSON.stringify(updates.assigned_bot_ids))
  }
  if (updates.cleared_at !== undefined) {
    fields.push("cleared_at = ?")
    values.push(updates.cleared_at ? new Date(updates.cleared_at) : null)
  }
  if (updates.memory !== undefined) {
    fields.push("memory = ?")
    values.push(updates.memory)
  }

  if (fields.length === 0) return await getRoomById(roomId, userId)

  values.push(roomId, userId)
  await execute(
    `UPDATE copilot_rooms SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    values
  )

  return await getRoomById(roomId, userId)
}

export async function deleteRoom(roomId: string, userId: string): Promise<boolean> {
  await execute("DELETE FROM copilot_files WHERE room_id = ? AND user_id = ?", [roomId, userId])
  await execute("DELETE FROM copilot_messages WHERE room_id = ? AND user_id = ?", [roomId, userId])
  const res = await execute("DELETE FROM copilot_rooms WHERE id = ? AND user_id = ?", [roomId, userId])
  return res.affectedRows > 0
}

// ----------------- MESSAGES -----------------

export async function getDirectBotMessages(botId: string, userId: string, limit = 50): Promise<CopilotMessage[]> {
  const bot = await getBotById(botId, userId)
  const clearedAt = bot?.cleared_at ? new Date(bot.cleared_at) : null
  const sql = clearedAt
    ? "SELECT * FROM copilot_messages WHERE bot_id = ? AND room_id IS NULL AND user_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT ?"
    : "SELECT * FROM copilot_messages WHERE bot_id = ? AND room_id IS NULL AND user_id = ? ORDER BY created_at ASC LIMIT ?"
  const params = clearedAt ? [botId, userId, clearedAt, limit] : [botId, userId, limit]
  const rows = await query<any>(sql, params)
  return rows.map(formatMessageRow)
}

export async function getRoomMessages(roomId: string, userId: string, limit = 60): Promise<CopilotMessage[]> {
  const room = await getRoomById(roomId, userId)
  const clearedAt = room?.cleared_at ? new Date(room.cleared_at) : null
  const sql = clearedAt
    ? "SELECT * FROM copilot_messages WHERE room_id = ? AND user_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT ?"
    : "SELECT * FROM copilot_messages WHERE room_id = ? AND user_id = ? ORDER BY created_at ASC LIMIT ?"
  const params = clearedAt ? [roomId, userId, clearedAt, limit] : [roomId, userId, limit]
  const rows = await query<any>(sql, params)
  return rows.map(formatMessageRow)
}

export async function addMessage(
  userId: string,
  data: {
    room_id?: string | null
    bot_id?: string | null
    sender_name: string
    role: "user" | "assistant" | "system"
    content: string
    image_url?: string | null
    reasoning?: string
    tool_calls?: any[]
    duration_seconds?: number | null
  }
): Promise<CopilotMessage> {
  const id = generate32CharId()
  await execute(
    `INSERT INTO copilot_messages 
     (id, user_id, room_id, bot_id, sender_name, role, content, image_url, reasoning, tool_calls, duration_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.room_id || null,
      data.bot_id || null,
      data.sender_name,
      data.role,
      data.content,
      data.image_url || null,
      data.reasoning || null,
      data.tool_calls ? JSON.stringify(data.tool_calls) : null,
      data.duration_seconds ?? null,
    ]
  )

  if (data.room_id) {
    await execute("UPDATE copilot_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [data.room_id])
  } else if (data.bot_id) {
    await execute("UPDATE copilot_bots SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [data.bot_id])
  }

  return {
    id,
    user_id: userId,
    room_id: data.room_id,
    bot_id: data.bot_id,
    sender_name: data.sender_name,
    role: data.role,
    content: data.content,
    image_url: data.image_url,
    reasoning: data.reasoning,
    tool_calls: data.tool_calls,
    duration_seconds: data.duration_seconds,
    created_at: new Date().toISOString(),
  }
}

// ----------------- FILES -----------------

export async function getBotFiles(botId: string, userId: string): Promise<CopilotFile[]> {
  return await query<CopilotFile>(
    "SELECT * FROM copilot_files WHERE bot_id = ? AND user_id = ? ORDER BY file_path ASC",
    [botId, userId]
  )
}

export async function getRoomFiles(roomId: string, userId: string): Promise<CopilotFile[]> {
  return await query<CopilotFile>(
    "SELECT * FROM copilot_files WHERE room_id = ? AND user_id = ? ORDER BY file_path ASC",
    [roomId, userId]
  )
}

export async function saveRoomFile(
  roomId: string,
  botId: string | null,
  userId: string,
  filePath: string,
  content: string
): Promise<CopilotFile> {
  const cleanPath = filePath.replace(/^\/+/, "")
  const existing = await query<any>(
    "SELECT id FROM copilot_files WHERE room_id = ? AND file_path = ? AND user_id = ?",
    [roomId, cleanPath, userId]
  )

  if (existing.length > 0) {
    await execute(
      "UPDATE copilot_files SET content = ?, bot_id = COALESCE(?, bot_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [content, botId, existing[0].id]
    )
    return {
      id: existing[0].id,
      room_id: roomId,
      bot_id: botId,
      user_id: userId,
      file_path: cleanPath,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await execute(
    "INSERT INTO copilot_files (id, room_id, bot_id, user_id, file_path, content) VALUES (?, ?, ?, ?, ?, ?)",
    [id, roomId, botId, userId, cleanPath, content]
  )

  return {
    id,
    room_id: roomId,
    bot_id: botId,
    user_id: userId,
    file_path: cleanPath,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  const res = await execute("DELETE FROM copilot_files WHERE id = ? AND user_id = ?", [fileId, userId])
  return res.affectedRows > 0
}

export async function saveBotFile(
  botId: string,
  userId: string,
  filePath: string,
  content: string
): Promise<CopilotFile> {
  const cleanPath = filePath.replace(/^\/+/, "")
  const existing = await query<any>(
    "SELECT id FROM copilot_files WHERE bot_id = ? AND file_path = ?",
    [botId, cleanPath]
  )

  if (existing.length > 0) {
    await execute(
      "UPDATE copilot_files SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [content, existing[0].id]
    )
    return {
      id: existing[0].id,
      bot_id: botId,
      user_id: userId,
      file_path: cleanPath,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await execute(
    "INSERT INTO copilot_files (id, bot_id, user_id, file_path, content) VALUES (?, ?, ?, ?, ?)",
    [id, botId, userId, cleanPath, content]
  )

  return {
    id,
    bot_id: botId,
    user_id: userId,
    file_path: cleanPath,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function formatBotRow(r: any): CopilotBot {
  let rules = { files: "allow", shell: "allow", browse: "allow", routines: "allow", manage: "ask" } as any
  try {
    if (r.rules) rules = typeof r.rules === "string" ? JSON.parse(r.rules) : r.rules
  } catch {}

  let openItems = []
  try {
    if (r.open_items) openItems = typeof r.open_items === "string" ? JSON.parse(r.open_items) : r.open_items
  } catch {}

  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    username: r.username || (r.name ? r.name.toLowerCase().replace(/[^a-z0-9_]/g, "") : "copilot"),
    role: r.role || "",
    shape: (r.shape || "rectangle") as RobotHeadShape,
    color: r.color || "#2b49a3",
    trim_color: r.trim_color || "#93a6c8",
    screen_color: r.screen_color || "#e8f2ff",
    model: r.model || null,
    status: r.status || "idle",
    is_pinned: Boolean(r.is_pinned),
    cleared_at: r.cleared_at ? new Date(r.cleared_at).toISOString() : null,
    rules,
    memory: r.memory || "",
    open_items: Array.isArray(openItems) ? openItems : [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

function formatMessageRow(r: any): CopilotMessage {
  return {
    id: r.id,
    user_id: r.user_id,
    room_id: r.room_id,
    bot_id: r.bot_id,
    sender_name: r.sender_name,
    role: r.role,
    content: r.content,
    image_url: r.image_url || null,
    reasoning: r.reasoning,
    tool_calls: typeof r.tool_calls === "string" ? JSON.parse(r.tool_calls) : r.tool_calls,
    duration_seconds: r.duration_seconds !== null && r.duration_seconds !== undefined ? Number(r.duration_seconds) : null,
    created_at: r.created_at,
  }
}

