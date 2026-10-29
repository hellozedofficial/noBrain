import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { comparePassword, setSessionCookie } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const users = await query(
      "SELECT id, name, email, password_hash, last_used_model FROM users WHERE email = ?",
      [trimmedEmail]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const user = users[0]
    const valid = await comparePassword(password, user.password_hash)

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    await setSessionCookie(user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        last_used_model: user.last_used_model,
      },
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
