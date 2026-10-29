import { NextResponse } from "next/server"
import path from "path"
import crypto from "crypto"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = path.extname(file.name) || ".png"
    const uniqueName = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`
    const key = `chat-images/${uniqueName}`
    const bucket = process.env.AWS_BUCKET || "zed-ai-s3-storage"
    const baseUrl = process.env.AWS_URL || `https://${bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const url = `${baseUrl.replace(/\/+$/, "")}/${key}`
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`

    return NextResponse.json({
      success: true,
      url,
      dataUrl,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 })
  }
}
