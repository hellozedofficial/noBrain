import { NextResponse } from "next/server"
import { execute } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const { messageId, feedback } = await req.json()

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 })
    }

    const validFeedback = feedback === "like" || feedback === "dislike" ? feedback : null

    await execute("UPDATE messages SET feedback = ? WHERE id = ?", [
      validFeedback,
      messageId,
    ])

    return NextResponse.json({
      success: true,
      messageId,
      feedback: validFeedback,
    })
  } catch (error: any) {
    console.error("Failed to update message feedback:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update feedback" },
      { status: 500 }
    )
  }
}

