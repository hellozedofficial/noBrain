import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listApiKeys,
  createApiKey,
} from "@/lib/apiKey"

/** GET /api/developer/keys — list all keys for the logged-in user */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const keys = await listApiKeys(user.id)

  // Mask the key: show first 12 chars then ****
  const masked = keys.map((k) => ({
    ...k,
    key: `${k.key.slice(0, 12)}${"*".repeat(k.key.length - 12)}`,
  }))

  return NextResponse.json({ success: true, keys: masked })
}

/** POST /api/developer/keys — create a new API key */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name: string = body.name?.trim() || "My API Key"
  const domains: string[] | null = Array.isArray(body.domains) && body.domains.length > 0
    ? body.domains
    : null

  try {
    const apiKey = await createApiKey(user.id, name, domains)
    // Return the full key ONCE — user must copy it now
    return NextResponse.json({ success: true, key: apiKey }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
