import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserProfile, updateUserProfile } from "@/lib/userProfile"

export async function GET() {
  try {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user?.id || null)
    return NextResponse.json({ profile })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    await updateUserProfile(user?.id || null, body)
    return NextResponse.json({ success: true, profile: body })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
