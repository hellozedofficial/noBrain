import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getContextUsageInfo } from "@/lib/contextWindow"
import path from "path"
import fs from "fs/promises"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const userId = user?.id || null

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const convRows = await query(
      "SELECT id, title, model, user_id, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)",
      [id, userId]
    )

    if (convRows.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const messages = await query(
      "SELECT id, conversation_id, role, content, model, image_url, prompt_tokens, completion_tokens, total_tokens, feedback, created_at FROM messages WHERE conversation_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at ASC",
      [id]
    )

    const contextUsage = getContextUsageInfo(messages)

    return NextResponse.json({
      conversation: convRows[0],
      messages,
      context_usage: contextUsage,
    })
  } catch (error: any) {
    console.error("Failed to fetch conversation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const userId = user?.id || null

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify conversation belongs to user before deleting
    const convRows = await query(
      "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
      [id, userId]
    )

    if (convRows.length === 0) {
      return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 404 })
    }

    // 1. Fetch messages in this conversation to find media files
    const messages = await query(
      "SELECT id, content, image_url FROM messages WHERE conversation_id = ?",
      [id]
    )

    // 2. Identify all local image/media paths
    const mediaPaths = new Set<string>()
    for (const msg of messages) {
      if (msg.image_url && typeof msg.image_url === "string") {
        if (msg.image_url.startsWith("/uploads/")) {
          mediaPaths.add(msg.image_url)
        }
      }
      if (msg.content && typeof msg.content === "string") {
        const matches = msg.content.match(/\/uploads\/[a-zA-Z0-9_\-\.]+/g)
        if (matches) {
          for (const m of matches) {
            mediaPaths.add(m)
          }
        }
      }
    }

    // 3. Delete physical media files from public/uploads
    for (const mediaUrl of mediaPaths) {
      try {
        const filename = path.basename(mediaUrl)
        const filePath = path.join(process.cwd(), "public", "uploads", filename)
        try {
          await fs.unlink(filePath)
          console.log(`Deleted media file: ${filePath}`)
        } catch (unlinkErr: any) {
          if (unlinkErr.code !== "ENOENT") {
            console.error(`Error unlinking ${filePath}:`, unlinkErr)
          }
        }
      } catch (err) {
        console.error(`Failed to delete media ${mediaUrl}:`, err)
      }
    }

    // 4. Soft delete conversation and messages for this user
    await execute(
      "UPDATE conversations SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [id, userId]
    )

    await execute(
      "UPDATE messages SET is_deleted = 1 WHERE conversation_id = ?",
      [id]
    )

    return NextResponse.json({ success: true, deletedMediaCount: mediaPaths.size })
  } catch (error: any) {
    console.error("Failed to delete conversation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
