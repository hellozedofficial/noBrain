#!/usr/bin/env node

/**
 * End-to-end OpenRouter test script
 * 
 * Usage:
 *   OPENROUTER_API_KEY="your_key" node scripts/test-openrouter.mjs
 *   or:
 *   npm run test:openrouter
 */

import { OpenRouter } from "@openrouter/sdk"
import mysql from "mysql2/promise"
import fs from "fs"
import path from "path"

async function resolveApiKey() {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()) {
    return process.env.OPENROUTER_API_KEY.trim()
  }

  // Attempt reading from .env.local if present
  try {
    const envPath = path.resolve(process.cwd(), ".env.local")
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8")
      const match = content.match(/^OPENROUTER_API_KEY=(.+)$/m)
      if (match && match[1]?.trim()) {
        return match[1].trim()
      }
    }
  } catch {}

  // Attempt reading from MySQL platform_config
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "openrouter_ai",
    })
    const [rows] = await conn.query("SELECT config_value FROM platform_config WHERE config_key = 'OPENROUTER_API_KEY'")
    await conn.end()
    if (Array.isArray(rows) && rows[0]?.config_value) {
      return rows[0].config_value.trim()
    }
  } catch {}

  return null
}

async function main() {
  console.log("==================================================")
  console.log("🚀 noBrain OpenRouter End-to-End Test Suite")
  console.log("==================================================")

  const apiKey = await resolveApiKey()

  if (!apiKey) {
    console.error("❌ ERROR: OPENROUTER_API_KEY is not set.")
    console.error("👉 Please create an API key at https://openrouter.ai/keys")
    console.error("👉 Set it via environment variable: export OPENROUTER_API_KEY=\"sk-or-v1-...\"")
    console.error("👉 Or enter it inside the noBrain HQ Admin Panel (/admin -> AI & Models)")
    process.exit(1)
  }

  console.log(`🔑 Using API Key: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`)

  try {
    console.log("📡 Initializing @openrouter/sdk client...")
    const openrouter = new OpenRouter({
      apiKey,
    })

    const testModel = process.env.TEST_MODEL || "meta-llama/llama-3.3-70b-instruct"
    console.log(`🤖 Testing chat completion with model: ${testModel}...`)

    const startTime = Date.now()
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ai.saleonic.com",
        "X-Title": "noBrain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: testModel,
        messages: [
          { role: "system", content: "You are noBrain test worker. Respond in 1 brief sentence." },
          { role: "user", content: "Say hello and confirm OpenRouter connection." },
        ],
        max_tokens: 50,
      }),
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenRouter returned status ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim() || "No content returned"
    const usage = data.usage || {}

    console.log("\n✅ SUCCESS! Connection verified.")
    console.log(`⏱️ Latency: ${latencyMs}ms`)
    console.log(`💬 Model Reply:\n   "${reply}"`)
    console.log(`📊 Token Usage: Input: ${usage.prompt_tokens || 0}, Output: ${usage.completion_tokens || 0}, Total: ${usage.total_tokens || 0}`)
    console.log("==================================================")
  } catch (error) {
    console.error("\n❌ Request failed:", error.message || error)
    process.exit(1)
  }
}

main()

