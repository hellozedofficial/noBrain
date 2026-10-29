import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import crypto from "crypto"

export async function GET() {
  try {
    const user = await getCurrentUser()
    const userId = user?.id || null

    if (!userId) {
      return NextResponse.json({ conversations: [] })
    }

    const rows = await query(
      "SELECT id, title, model, created_at, updated_at FROM conversations WHERE user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY updated_at DESC",
      [userId]
    )

    return NextResponse.json({ conversations: rows })
  } catch (error: any) {
    console.error("Failed to fetch conversations:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const userId = user?.id || null

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to create a conversation." },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const id = body.id || crypto.randomBytes(16).toString("hex")
    const title = body.title || "New Chat"
    const model = "nobrain-1.5"

    await execute(
      "INSERT INTO conversations (id, title, model, user_id) VALUES (?, ?, ?, ?)",
      [id, title, model, userId]
    )

    return NextResponse.json({ id, title, model })
  } catch (error: any) {
    console.error("Failed to create conversation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
