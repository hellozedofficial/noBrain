import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { revokeApiKey, updateApiKeyDomains, listApiKeys } from "@/lib/apiKey"

/** PATCH /api/developer/keys/[id] — update domain allowlist */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const keyId = parseInt(id, 10)
  if (isNaN(keyId)) return NextResponse.json({ error: "Invalid key ID" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const domains: string[] | null = Array.isArray(body.domains) && body.domains.length > 0
    ? body.domains
    : null

  await updateApiKeyDomains(user.id, keyId, domains)
  return NextResponse.json({ success: true })
}

/** DELETE /api/developer/keys/[id] — revoke an API key */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const keyId = parseInt(id, 10)
  if (isNaN(keyId)) return NextResponse.json({ error: "Invalid key ID" }, { status: 400 })

  // Verify this key belongs to the user
  const keys = await listApiKeys(user.id)
  if (!keys.find((k) => k.id === keyId)) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 })
  }

  await revokeApiKey(user.id, keyId)
  return NextResponse.json({ success: true })
}
