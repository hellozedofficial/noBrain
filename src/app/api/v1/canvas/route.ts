import { NextResponse } from "next/server"
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import crypto from "crypto"
import { validateApiKey } from "@/lib/apiKey"

const UPSCALE_MODEL_ID = "stability.stable-fast-upscale-v1:0"

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

/**
 * POST /api/v1/canvas
 *
 * Fast image upscaling via Stability AI on Amazon Bedrock.
 *
 * Request body:
 *   image_url  string   REQUIRED  Public URL of the input image
 *   prompt     string   OPTIONAL  Text prompt to guide upscaling
 *
 * Headers:
 *   Authorization: Bearer nbr_<key>
 *
 * Response:
 *   { success: true, image_url: string, images: string[], model: string }
 */
export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization")
  const originHeader =
    req.headers.get("origin") || req.headers.get("referer") || null

  const validation = await validateApiKey(authHeader, originHeader)
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 401 }
    )
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    )
  }

  const imageUrl: string = typeof body.image_url === "string" ? body.image_url.trim() : ""
  if (!imageUrl) {
    return NextResponse.json(
      { success: false, error: "image_url is required." },
      { status: 400 }
    )
  }

  const prompt: string = typeof body.prompt === "string" ? body.prompt.trim() : ""

  // ── Fetch input image ─────────────────────────────────────────────────────
  let imageBytes: Buffer
  let mimeType: string
  try {
    const fetchRes = await fetch(imageUrl)
    if (!fetchRes.ok) throw new Error(`Failed to fetch image: HTTP ${fetchRes.status}`)
    const contentType = fetchRes.headers.get("content-type") || "image/jpeg"
    mimeType = contentType.split(";")[0].trim()
    imageBytes = Buffer.from(await fetchRes.arrayBuffer())
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Could not fetch image_url: ${err.message}` },
      { status: 400 }
    )
  }

  // ── Call Stability upscale model ──────────────────────────────────────────
  try {
    const requestBody: Record<string, any> = {
      image: imageBytes.toString("base64"),
    }
    if (prompt) requestBody.prompt = prompt

    const command = new InvokeModelCommand({
      modelId: UPSCALE_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: Buffer.from(JSON.stringify(requestBody)),
    })

    const response = await bedrockClient.send(command)
    const responseBody = JSON.parse(Buffer.from(response.body).toString("utf-8"))

    // Stability returns { images: ["base64..."] }
    const base64Images: string[] = responseBody.images ?? []
    if (base64Images.length === 0) {
      return NextResponse.json(
        { success: false, error: "No images returned from upscale model." },
        { status: 500 }
      )
    }

    // ── Upload result to S3 ───────────────────────────────────────────────────
    const resultBuffer = Buffer.from(base64Images[0], "base64")
    const bucket = process.env.AWS_BUCKET || "zed-ai-s3-storage"
    const baseUrl =
      process.env.AWS_URL ||
      `https://${bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`
    const key = `canvas/result_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: resultBuffer,
        ContentType: "image/png",
      })
    )

    const resultUrl = `${baseUrl.replace(/\/+$/, "")}/${key}`

    return NextResponse.json({
      success: true,
      image_url: resultUrl,
      images: base64Images,
      model: UPSCALE_MODEL_ID,
    })
  } catch (err: any) {
    console.error("[v1/canvas] Bedrock error:", err)
    return NextResponse.json(
      { success: false, error: "Image upscale failed. Please try again." },
      { status: 500 }
    )
  }
}
