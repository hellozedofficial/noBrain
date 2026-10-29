import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getSaleonicSetting,
  testAndSaveSaleonicConfig,
  disconnectSaleonic,
} from "@/lib/saleonic/service"

export async function GET() {
  try {
    const user = await getCurrentUser()
    const setting = await getSaleonicSetting(user?.id)

    if (!setting || !setting.api_key) {
      return NextResponse.json({
        isConnected: false,
        baseUrl: "https://saleonic.com/api/v1",
        maskedKey: null,
        lastTestedAt: null,
      })
    }

    const key = setting.api_key
    const maskedKey =
      key.length > 12
        ? `${key.slice(0, 8)}...${key.slice(-4)}`
        : "********"

    return NextResponse.json({
      isConnected: Boolean(setting.is_connected),
      baseUrl: setting.base_url || "https://saleonic.com/api/v1",
      maskedKey,
      lastTestedAt: setting.last_tested_at,
    })
  } catch (error: any) {
    console.error("Saleonic config GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json().catch(() => ({}))
    const { apiKey, baseUrl } = body

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required." },
        { status: 400 }
      )
    }

    const result = await testAndSaveSaleonicConfig(
      user?.id || null,
      apiKey,
      baseUrl || "https://saleonic.com/api/v1"
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Saleonic config POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to connect to Saleonic.",
        details: error.errors || null,
      },
      { status: error.status || 400 }
    )
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser()
    await disconnectSaleonic(user?.id)
    return NextResponse.json({ success: true, message: "Saleonic disconnected." })
  } catch (error: any) {
    console.error("Saleonic config DELETE error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
