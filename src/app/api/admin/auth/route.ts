import { NextResponse } from "next/server"
import { getPlatformConfigValue } from "@/lib/platform-config"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { key, action } = await req.json()
    const cookieStore = await cookies()

    if (action === "logout") {
      cookieStore.delete("nobrain_hq_session")
      return NextResponse.json({ success: true, message: "Logged out from Admin HQ" })
    }

    const secretKey = await getPlatformConfigValue("ADMIN_ACCESS_KEY", "nobrain-hq-2026")

    if (key === secretKey) {
      cookieStore.set("nobrain_hq_session", secretKey, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      return NextResponse.json({ success: true, message: "Admin access granted" })
    }

    return NextResponse.json({ success: false, error: "Invalid Admin Key" }, { status: 401 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

