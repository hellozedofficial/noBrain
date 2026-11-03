import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserBots, createBot } from "@/lib/copilot/store"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const bots = await getUserBots(user.id)
    return NextResponse.json({ bots })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, username, role, shape, color, trim_color, screen_color } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const bot = await createBot(user.id, {
      name,
      username,
      role,
      shape,
      color,
      trim_color,
      screen_color,
    })

    return NextResponse.json({ bot })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

