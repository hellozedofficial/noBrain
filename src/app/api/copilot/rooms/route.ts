import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserRooms, createRoom } from "@/lib/copilot/store"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rooms = await getUserRooms(user.id)
    return NextResponse.json({ rooms })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, topic, avatar_url, chief_bot_id, is_pinned, assigned_bot_ids } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    const room = await createRoom(user.id, {
      name,
      topic,
      avatar_url,
      chief_bot_id,
      is_pinned,
      assigned_bot_ids: Array.isArray(assigned_bot_ids) ? assigned_bot_ids : [],
    })

    return NextResponse.json({ room })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

