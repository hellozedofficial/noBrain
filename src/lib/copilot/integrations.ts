import "server-only"
import { query, execute } from "@/lib/db"
import crypto from "crypto"

export interface CopilotIntegration {
  id: string
  user_id: string
  provider: string
  account_email: string | null
  status: "connected" | "disconnected"
  metadata: any
  created_at: string
  updated_at: string
}

export function generateIntegrationId(): string {
  return "int_" + crypto.randomBytes(12).toString("hex")
}

export async function getUserIntegrations(userId: string): Promise<CopilotIntegration[]> {
  const rows = await query<any>(
    "SELECT * FROM copilot_integrations WHERE user_id = ? ORDER BY created_at ASC",
    [userId]
  )
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    provider: r.provider,
    account_email: r.account_email,
    status: r.status,
    metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata || "{}") : r.metadata || {},
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
}

export async function getIntegration(
  userId: string,
  provider: string
): Promise<CopilotIntegration | null> {
  const rows = await query<any>(
    "SELECT * FROM copilot_integrations WHERE user_id = ? AND provider = ? LIMIT 1",
    [userId, provider]
  )
  if (!rows.length) return null
  const r = rows[0]
  return {
    id: r.id,
    user_id: r.user_id,
    provider: r.provider,
    account_email: r.account_email,
    status: r.status,
    metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata || "{}") : r.metadata || {},
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

export async function connectIntegration(
  userId: string,
  provider: string,
  accountEmail?: string,
  metadata?: any
): Promise<CopilotIntegration> {
  const id = generateIntegrationId()
  const metaStr = metadata ? JSON.stringify(metadata) : null

  await execute(
    `INSERT INTO copilot_integrations (id, user_id, provider, account_email, status, metadata)
     VALUES (?, ?, ?, ?, 'connected', ?)
     ON DUPLICATE KEY UPDATE
       status = 'connected',
       account_email = VALUES(account_email),
       metadata = VALUES(metadata),
       updated_at = NOW()`,
    [id, userId, provider, accountEmail || null, metaStr]
  )

  const updated = await getIntegration(userId, provider)
  return updated!
}

export async function disconnectIntegration(
  userId: string,
  provider: string
): Promise<void> {
  await execute(
    "DELETE FROM copilot_integrations WHERE user_id = ? AND provider = ?",
    [userId, provider]
  )
}

