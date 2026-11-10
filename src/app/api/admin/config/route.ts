import { NextResponse } from "next/server"
import { getPlatformConfigs, saveMultiplePlatformConfigs, getPlatformConfigValue } from "@/lib/platform-config"
import { query } from "@/lib/db"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"

async function verifyAdminAuth(req: Request): Promise<boolean> {
  const secretKey = await getPlatformConfigValue("ADMIN_ACCESS_KEY", "nobrain-hq-2026")
  
  // Check header
  const headerKey = req.headers.get("x-admin-key")
  if (headerKey && headerKey === secretKey) return true

  // Check cookie
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("nobrain_hq_session")?.value
  if (sessionToken && sessionToken === secretKey) return true

  // Check if logged-in user is admin
  try {
    const user = await getCurrentUser()
    if (user && (user.email === "emon2072h@gmail.com" || user.email === "mahmud@nobrain.ai")) {
      return true
    }
  } catch {}

  // Local development fallback
  const host = req.headers.get("host") || ""
  if (process.env.NODE_ENV === "development" && (host.includes("localhost") || host.includes("127.0.0.1"))) {
    return true
  }

  return false
}

export async function GET(req: Request) {
  try {
    const isAuthorized = await verifyAdminAuth(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Admin access key required" }, { status: 401 })
    }

    const configs = await getPlatformConfigs()

    // Fetch system overview stats
    let stats = {
      totalUsers: 0,
      totalBots: 0,
      totalRooms: 0,
      totalMessages: 0,
      totalWalletBalance: 0,
      totalIntegrations: 0,
      dbStatus: "healthy",
      dbLatencyMs: 0,
    }

    const tStart = Date.now()
    try {
      const [u] = await query<any>("SELECT COUNT(*) as count FROM users")
      const [b] = await query<any>("SELECT COUNT(*) as count FROM copilot_bots")
      const [r] = await query<any>("SELECT COUNT(*) as count FROM copilot_rooms")
      const [m] = await query<any>("SELECT COUNT(*) as count FROM copilot_messages")
      const [w] = await query<any>("SELECT SUM(balance) as total FROM wallets")
      const [i] = await query<any>("SELECT COUNT(*) as count FROM copilot_integrations WHERE status = 'connected'")
      
      stats = {
        totalUsers: Number(u?.count || 0),
        totalBots: Number(b?.count || 0),
        totalRooms: Number(r?.count || 0),
        totalMessages: Number(m?.count || 0),
        totalWalletBalance: Number(w?.total || 0),
        totalIntegrations: Number(i?.count || 0),
        dbStatus: "healthy",
        dbLatencyMs: Date.now() - tStart,
      }
    } catch (e: any) {
      stats.dbStatus = "error: " + e.message
    }

    return NextResponse.json({
      success: true,
      configs,
      stats,
      serverTime: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAdminAuth(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Admin access key required" }, { status: 401 })
    }

    const body = await req.json()
    const { updates } = body

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid updates format. Expected object { key: value }" }, { status: 400 })
    }

    await saveMultiplePlatformConfigs(updates)

    return NextResponse.json({
      success: true,
      message: `Updated ${Object.keys(updates).length} configurations successfully`,
      updatedKeys: Object.keys(updates),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

