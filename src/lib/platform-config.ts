import "server-only"
import { query, execute } from "@/lib/db"

export interface ConfigItem {
  key: string
  value: string
  category: "general" | "ai" | "pricing" | "payment" | "integrations" | "smtp" | "security"
  description: string
  is_secret?: boolean
}

let configCache: Record<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 30_000

export const DEFAULT_CONFIGS: ConfigItem[] = [
  // General
  { key: "PLATFORM_NAME", value: "noBrain 1.5", category: "general", description: "Public platform branding and assistant identity name" },
  { key: "APP_URL", value: process.env.APP_URL || "https://ai.saleonic.com", category: "general", description: "Public web application URL (domain for users and callbacks)" },
  { key: "ADMIN_URL", value: "https://nobrain-hq.saleonic.com", category: "general", description: "Admin HQ domain URL" },
  { key: "PLATFORM_MAINTENANCE_MODE", value: "false", category: "general", description: "Enable platform maintenance mode (restricts access)" },

  // AI & Bedrock
  { key: "AWS_BEDROCK_MODEL_ID", value: process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-120b-1:0", category: "ai", description: "Primary LLM Model ID on AWS Bedrock" },
  { key: "VISION_BEDROCK_MODEL_ID", value: "amazon.nova-pro-v1:0", category: "ai", description: "Multimodal visual perception model on AWS Bedrock" },
  { key: "AWS_REGION", value: process.env.AWS_REGION || "us-east-1", category: "ai", description: "AWS Bedrock deployment region" },
  { key: "CHAT_CONTEXT_WINDOW_LIMIT", value: process.env.CHAT_CONTEXT_WINDOW_LIMIT || "128000", category: "ai", description: "Maximum conversation context tokens window" },
  { key: "BEDROCK_TEMPERATURE", value: "0.7", category: "ai", description: "Sampling temperature for model generation (0.0 to 1.0)" },
  { key: "BEDROCK_MAX_TOKENS", value: "2500", category: "ai", description: "Max output tokens per stream turn" },

  // Pricing & Wallet Billing (BDT)
  { key: "PLATFORM_INPUT_PER_MILLION_PRICE", value: process.env.PLATFORM_INPUT_PER_MILLION_PRICE || "10", category: "pricing", description: "Cost in BDT per 1 Million input tokens" },
  { key: "PLATFORM_OUTPUT_PER_MILLION_PRICE", value: process.env.PLATFORM_OUTPUT_PER_MILLION_PRICE || "15", category: "pricing", description: "Cost in BDT per 1 Million output tokens" },
  { key: "PLATFORM_MINIMUM_RECHARGE_AMOUNT", value: process.env.PLATFORM_MINIMUM_RECHARGE_AMOUNT || "500", category: "pricing", description: "Minimum wallet top-up in BDT" },
  { key: "PLATFORM_PREPAID_ONLY", value: process.env.PLATFORM_PREPAID_ONLY || "true", category: "pricing", description: "Enforce positive wallet balance before processing turns" },
  { key: "PLATFORM_CURRENCY", value: "BDT", category: "pricing", description: "Default currency code for wallet display" },

  // EPS Payment Gateway
  { key: "PLATFORM_EPS_ENABLED", value: process.env.PLATFORM_EPS_ENABLED || "true", category: "payment", description: "Enable EPS payment gateway integration" },
  { key: "PLATFORM_EPS_SANDBOX", value: process.env.PLATFORM_EPS_SANDBOX || "false", category: "payment", description: "Run EPS in sandbox testing mode" },
  { key: "PLATFORM_EPS_MERCHANT_ID", value: process.env.PLATFORM_EPS_MERCHANT_ID || "", category: "payment", description: "EPS merchant identifier", is_secret: true },
  { key: "PLATFORM_EPS_STORE_ID", value: process.env.PLATFORM_EPS_STORE_ID || "", category: "payment", description: "EPS store identifier", is_secret: true },
  { key: "PLATFORM_EPS_USERNAME", value: process.env.PLATFORM_EPS_USERNAME || "", category: "payment", description: "EPS account login username" },

  // Google OAuth & Integrations
  { key: "GOOGLE_CLIENT_ID", value: process.env.GOOGLE_CLIENT_ID || "", category: "integrations", description: "Google OAuth 2.0 Client ID for Drive & Gmail" },
  { key: "GOOGLE_CLIENT_SECRET", value: process.env.GOOGLE_CLIENT_SECRET || "", category: "integrations", description: "Google OAuth 2.0 Client Secret", is_secret: true },
  { key: "GOOGLE_REDIRECT_URI", value: process.env.GOOGLE_REDIRECT_URI || "https://ai.saleonic.com/api/auth/google/callback", category: "integrations", description: "OAuth callback URL" },
  { key: "INTEGRATIONS_GMAIL_ENABLED", value: "true", category: "integrations", description: "Enable Gmail autonomous agent toolset" },
  { key: "INTEGRATIONS_DRIVE_ENABLED", value: "true", category: "integrations", description: "Enable Google Drive sync & file creation" },

  // SMTP Mailer
  { key: "MAIL_HOST", value: process.env.MAIL_HOST || "", category: "smtp", description: "SMTP host domain/server" },
  { key: "MAIL_PORT", value: process.env.MAIL_PORT || "587", category: "smtp", description: "SMTP server port" },
  { key: "MAIL_ENCRYPTION", value: process.env.MAIL_ENCRYPTION || "tls", category: "smtp", description: "Encryption protocol: tls or ssl" },
  { key: "MAIL_USERNAME", value: process.env.MAIL_USERNAME || "", category: "smtp", description: "SMTP username / auth key" },
  { key: "MAIL_PASSWORD", value: process.env.MAIL_PASSWORD || "", category: "smtp", description: "SMTP password / secret", is_secret: true },
  { key: "MAIL_FROM_ADDRESS", value: process.env.MAIL_FROM_ADDRESS || "support@saleonic.com", category: "smtp", description: "Default sender email address" },
  { key: "MAIL_FROM_NAME", value: process.env.MAIL_FROM_NAME || "noBrain", category: "smtp", description: "Sender display name" },

  // Security / Admin
  { key: "ADMIN_ACCESS_KEY", value: process.env.ADMIN_ACCESS_KEY || "nobrain-hq-2026", category: "security", description: "Secret master key for noBrain HQ admin panel access", is_secret: true },
]

export async function ensureConfigTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS platform_config (
      config_key varchar(100) NOT NULL,
      config_value longtext DEFAULT NULL,
      category varchar(50) NOT NULL DEFAULT 'general',
      description varchar(255) DEFAULT NULL,
      is_secret tinyint(1) NOT NULL DEFAULT 0,
      updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (config_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)
}

export async function getPlatformConfigs(): Promise<ConfigItem[]> {
  await ensureConfigTable()
  const now = Date.now()

  let dbRows: Array<{
    config_key: string
    config_value: string
    category: string
    description: string
    is_secret: number
  }> = []

  try {
    dbRows = await query(`SELECT * FROM platform_config`)
  } catch (err) {
    console.warn("Could not query platform_config table:", err)
  }

  const dbMap = new Map(dbRows.map((r) => [r.config_key, r]))

  const result: ConfigItem[] = DEFAULT_CONFIGS.map((def) => {
    const fromDb = dbMap.get(def.key)
    if (fromDb && fromDb.config_value !== null && fromDb.config_value !== undefined) {
      return {
        key: def.key,
        value: fromDb.config_value,
        category: (fromDb.category as any) || def.category,
        description: fromDb.description || def.description,
        is_secret: Boolean(fromDb.is_secret ?? def.is_secret),
      }
    }
    return def
  })

  // Append any custom keys added by admin in DB that are not in defaults
  for (const [k, row] of dbMap.entries()) {
    if (!DEFAULT_CONFIGS.some((d) => d.key === k)) {
      result.push({
        key: k,
        value: row.config_value || "",
        category: (row.category as any) || "general",
        description: row.description || "",
        is_secret: Boolean(row.is_secret),
      })
    }
  }

  // Update memory cache
  const cacheObj: Record<string, string> = {}
  for (const item of result) {
    cacheObj[item.key] = item.value
  }
  configCache = cacheObj
  cacheTimestamp = now

  return result
}

export async function getPlatformConfigValue(key: string, fallback?: string): Promise<string> {
  const now = Date.now()
  if (configCache && now - cacheTimestamp < CACHE_TTL_MS && configCache[key] !== undefined) {
    return configCache[key]
  }

  const configs = await getPlatformConfigs()
  const item = configs.find((c) => c.key === key)
  if (item && item.value !== undefined && item.value !== "") {
    return item.value
  }

  if (process.env[key] !== undefined && process.env[key] !== "") {
    return process.env[key] as string
  }

  if (fallback !== undefined) {
    return fallback
  }

  const def = DEFAULT_CONFIGS.find((d) => d.key === key)
  return def ? def.value : ""
}

export async function savePlatformConfig(
  key: string,
  value: string,
  meta?: { category?: string; description?: string; is_secret?: boolean }
) {
  await ensureConfigTable()

  const def = DEFAULT_CONFIGS.find((d) => d.key === key)
  const category = meta?.category || def?.category || "general"
  const description = meta?.description || def?.description || ""
  const isSecret = meta?.is_secret !== undefined ? (meta.is_secret ? 1 : 0) : def?.is_secret ? 1 : 0

  await execute(
    `INSERT INTO platform_config (config_key, config_value, category, description, is_secret)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       config_value = VALUES(config_value),
       category = VALUES(category),
       description = VALUES(description),
       is_secret = VALUES(is_secret)`,
    [key, value, category, description, isSecret]
  )

  // Invalidate cache
  configCache = null
}

export async function saveMultiplePlatformConfigs(updates: Record<string, string>) {
  for (const [k, v] of Object.entries(updates)) {
    await savePlatformConfig(k, v)
  }
}

