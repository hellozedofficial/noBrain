import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { execute } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    return NextResponse.json({ user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { last_used_model } = await req.json()
    if (last_used_model) {
      await execute("UPDATE users SET last_used_model = ? WHERE id = ?", [
        last_used_model,
        user.id,
      ])
    }

    return NextResponse.json({ success: true, last_used_model })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
