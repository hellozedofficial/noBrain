import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { hashPassword, setSessionCookie } from "@/lib/auth"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const existing = await query("SELECT id FROM users WHERE email = ?", [trimmedEmail])

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const userId = crypto.randomUUID()
    const hashedPassword = await hashPassword(password)
    const defaultModel = "inclusionai/ling-3.0-flash-sante:free"

    await execute(
      "INSERT INTO users (id, name, email, password_hash, last_used_model) VALUES (?, ?, ?, ?, ?)",
      [userId, name.trim(), trimmedEmail, hashedPassword, defaultModel]
    )

    await setSessionCookie(userId)

    return NextResponse.json({
      user: {
        id: userId,
        name: name.trim(),
        email: trimmedEmail,
        last_used_model: defaultModel,
      },
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
