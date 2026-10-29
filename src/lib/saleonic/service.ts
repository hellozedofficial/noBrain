import { query, execute } from "@/lib/db"
import { SaleonicClient } from "./client"

export interface SaleonicSettingRow {
  id: number
  user_id: string
  api_key: string
  base_url: string
  is_connected: number
  last_tested_at: string | null
  merchant_info: string | null
  created_at: string
  updated_at: string
}

export async function getSaleonicSetting(
  userId?: string | null
): Promise<SaleonicSettingRow | null> {
  const targetUserId = userId || "default"

  // First try the specific user, fallback to "default" if user has none
  let rows = await query<SaleonicSettingRow>(
    "SELECT * FROM saleonic_settings WHERE user_id = ? LIMIT 1",
    [targetUserId]
  )

  if (rows.length === 0 && targetUserId !== "default") {
    rows = await query<SaleonicSettingRow>(
      "SELECT * FROM saleonic_settings WHERE user_id = 'default' LIMIT 1"
    )
  }

  return rows[0] || null
}

export async function testAndSaveSaleonicConfig(
  userId: string | null,
  apiKey: string,
  baseUrl: string = "https://saleonic.com/api/v1"
): Promise<{ success: boolean; message: string; data?: any }> {
  const cleanKey = apiKey.trim()
  const cleanBase = (baseUrl || "https://saleonic.com/api/v1").trim().replace(/\/+$/, "")
  const targetUserId = userId || "default"

  if (!cleanKey) {
    throw new Error("Saleonic API key is required.")
  }

  // 1. Test connection with live ping
  const client = new SaleonicClient({ apiKey: cleanKey, baseUrl: cleanBase })
  const pingRes = await client.ping()

  // 2. Upsert into database
  await execute(
    `INSERT INTO saleonic_settings (user_id, api_key, base_url, is_connected, last_tested_at, merchant_info)
     VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?)
     ON DUPLICATE KEY UPDATE
       api_key = VALUES(api_key),
       base_url = VALUES(base_url),
       is_connected = 1,
       last_tested_at = CURRENT_TIMESTAMP,
       merchant_info = VALUES(merchant_info)`,
    [targetUserId, cleanKey, cleanBase, JSON.stringify(pingRes)]
  )

  return {
    success: true,
    message: pingRes.message || "Saleonic connected successfully.",
    data: pingRes,
  }
}

export async function disconnectSaleonic(userId?: string | null): Promise<void> {
  const targetUserId = userId || "default"
  await execute("DELETE FROM saleonic_settings WHERE user_id = ?", [targetUserId])
}

export class SaleonicNotConnectedError extends Error {
  status = 400
  constructor(
    message = "Saleonic is not connected. Please configure your API key in Settings."
  ) {
    super(message)
    this.name = "SaleonicNotConnectedError"
  }
}

export async function getActiveSaleonicClient(
  userId?: string | null
): Promise<SaleonicClient> {
  const setting = await getSaleonicSetting(userId)
  if (!setting || !setting.api_key) {
    throw new SaleonicNotConnectedError()
  }
  return new SaleonicClient({
    apiKey: setting.api_key,
    baseUrl: setting.base_url || "https://saleonic.com/api/v1",
  })
}
