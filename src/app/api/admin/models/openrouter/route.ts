import { NextResponse } from "next/server"
import { fetchLiveOpenRouterModels } from "@/lib/openrouter"
import { getPlatformConfigValue } from "@/lib/platform-config"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"

async function verifyAdminAuth(req: Request): Promise<boolean> {
  const secretKey = await getPlatformConfigValue("ADMIN_ACCESS_KEY", "nobrain-hq-2026")
  const cookieStore = await cookies()
  const session = cookieStore.get("nobrain_hq_session")?.value
  if (session && session === secretKey) return true

  try {
    const user = await getCurrentUser()
    if (user && (user.email === "emon2072h@gmail.com" || user.email === "mahmud@nobrain.ai")) {
      return true
    }
  } catch {}

  const host = req.headers.get("host") || ""
  if (process.env.NODE_ENV === "development" && (host.includes("localhost") || host.includes("127.0.0.1"))) {
    return true
  }
  return false
}

export async function GET(req: Request) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get("q") || "").toLowerCase().trim()

    const models = await fetchLiveOpenRouterModels()
    let filtered = models
    if (query) {
      filtered = models.filter(
        (m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
      )
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      models: filtered.slice(0, 50), // return top 50 matches
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

