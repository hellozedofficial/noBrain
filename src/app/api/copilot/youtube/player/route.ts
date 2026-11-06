import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getYouTubePlayerState,
  saveYouTubePlayerState,
  agentControlYouTubePlayer,
} from "@/lib/copilot/youtubePlayer"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const state = await getYouTubePlayerState(user.id)
    return NextResponse.json(state)
  } catch (err: any) {
    console.error("GET /api/copilot/youtube/player error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, video, queue, notes, partialState, ...controlParams } = body

    if (action) {
      const result = await agentControlYouTubePlayer(user.id, {
        action,
        ...controlParams,
      })
      return NextResponse.json(result)
    }

    // Direct state update
    const updated = await saveYouTubePlayerState(user.id, {
      currentVideo: video !== undefined ? video : undefined,
      queue: queue !== undefined ? queue : undefined,
      notes: notes !== undefined ? notes : undefined,
      ...partialState,
    })

    return NextResponse.json({ success: true, player: updated })
  } catch (err: any) {
    console.error("POST /api/copilot/youtube/player error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
