import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  saveBotFile,
  saveRoomFile,
  getBotFiles,
  getRoomFiles,
  deleteFile,
} from "@/lib/copilot/store"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const botId = searchParams.get("botId")
    const roomId = searchParams.get("roomId")

    if (roomId) {
      const files = await getRoomFiles(roomId, user.id)
      return NextResponse.json({ files })
    }
    if (botId) {
      const files = await getBotFiles(botId, user.id)
      return NextResponse.json({ files })
    }

    return NextResponse.json({ error: "Missing botId or roomId" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { botId, roomId, path, content } = body

    if (!path || !path.trim()) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 })
    }

    let file
    if (roomId) {
      file = await saveRoomFile(roomId, botId || null, user.id, path.trim(), content ?? "")
    } else if (botId) {
      file = await saveBotFile(botId, user.id, path.trim(), content ?? "")
    } else {
      return NextResponse.json({ error: "botId or roomId required" }, { status: 400 })
    }

    return NextResponse.json({ file })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get("fileId")
    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 })
    }

    const success = await deleteFile(fileId, user.id)
    return NextResponse.json({ success })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

