import { NextResponse } from "next/server"
import { getPlatformConfigValue } from "@/lib/platform-config"
import { query } from "@/lib/db"
import { getMailTransporter } from "@/lib/mail"
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime"

export async function POST(req: Request) {
  try {
    const { service } = await req.json()
    const startTime = Date.now()

    if (service === "database") {
      const rows = await query("SELECT 1 as alive")
      const [tableCount] = await query<any>("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()")
      const latencyMs = Date.now() - startTime
      return NextResponse.json({
        success: true,
        service: "database",
        message: "Database connection active and responsive",
        latencyMs,
        details: {
          tables: Number(tableCount?.count || 0),
          alive: rows.length > 0,
        },
      })
    }

    if (service === "bedrock") {
      const region = await getPlatformConfigValue("AWS_REGION", process.env.AWS_REGION || "us-east-1")
      const modelId = await getPlatformConfigValue("AWS_BEDROCK_MODEL_ID", process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-120b-1:0")

      const client = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      })

      const cmd = new ConverseCommand({
        modelId,
        messages: [{ role: "user", content: [{ text: "ping" }] }],
        inferenceConfig: { maxTokens: 5, temperature: 0.1 },
      })

      const out = await client.send(cmd)
      const latencyMs = Date.now() - startTime
      const reply = out.output?.message?.content?.[0]?.text || "OK"

      return NextResponse.json({
        success: true,
        service: "bedrock",
        message: `AWS Bedrock connected successfully (${modelId})`,
        latencyMs,
        details: { modelId, region, sampleOutput: reply.trim() },
      })
    }

    if (service === "smtp") {
      const transporter = getMailTransporter()
      await transporter.verify()
      const latencyMs = Date.now() - startTime
      const host = await getPlatformConfigValue("MAIL_HOST", process.env.MAIL_HOST || "")
      const fromAddr = await getPlatformConfigValue("MAIL_FROM_ADDRESS", process.env.MAIL_FROM_ADDRESS || "")

      return NextResponse.json({
        success: true,
        service: "smtp",
        message: `SMTP Mail Server connected and verified (${host})`,
        latencyMs,
        details: { host, from: fromAddr },
      })
    }

    if (service === "eps") {
      const sandbox = (await getPlatformConfigValue("PLATFORM_EPS_SANDBOX", "false")) === "true"
      const storeId = await getPlatformConfigValue("PLATFORM_EPS_STORE_ID", process.env.PLATFORM_EPS_STORE_ID || "")
      const merchantId = await getPlatformConfigValue("PLATFORM_EPS_MERCHANT_ID", process.env.PLATFORM_EPS_MERCHANT_ID || "")
      const latencyMs = Date.now() - startTime

      const configured = Boolean(storeId && merchantId)
      return NextResponse.json({
        success: configured,
        service: "eps",
        message: configured
          ? `EPS Payment Gateway configured in ${sandbox ? "SANDBOX" : "LIVE"} mode`
          : "EPS Payment Gateway missing Store ID or Merchant ID",
        latencyMs,
        details: { mode: sandbox ? "sandbox" : "live", storeIdPresent: Boolean(storeId), merchantIdPresent: Boolean(merchantId) },
      })
    }

    return NextResponse.json({ error: "Unknown service" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Service test failed",
    }, { status: 500 })
  }
}

