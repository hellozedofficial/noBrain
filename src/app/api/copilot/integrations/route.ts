import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getUserIntegrations,
  connectIntegration,
  disconnectIntegration,
} from "@/lib/copilot/integrations"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const integrations = await getUserIntegrations(user.id)
    return NextResponse.json({ integrations, user_email: user.email })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { provider, account_email, metadata } = body

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 })
    }

    const email = account_email?.trim() || user.email || ""
    const integration = await connectIntegration(user.id, provider, email, metadata)

    return NextResponse.json({ success: true, integration })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const provider = searchParams.get("provider")

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 })
    }

    await disconnectIntegration(user.id, provider)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

