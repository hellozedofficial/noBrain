import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { getPlatformConfigValue } from "@/lib/platform-config"
import { cookies } from "next/headers"

async function verifyAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get("nobrain_hq_session")?.value
  const secretKey = await getPlatformConfigValue("ADMIN_ACCESS_KEY", "nobrain-hq-2026")
  return Boolean(session && session === secretKey)
}

// GET all models (both active and inactive)
export async function GET() {
  if (!(await verifyAdminAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await query<any>(
      `SELECT 
        id, 
        name, 
        provider, 
        description, 
        input_text as inputText, 
        input_image as inputImage, 
        output_text as outputText, 
        output_image as outputImage, 
        input_price_per_million as inputPricePerMillion, 
        output_price_per_million as outputPricePerMillion, 
        is_active as isActive,
        is_default as isDefault,
        sort_order as sortOrder,
        created_at as createdAt,
        updated_at as updatedAt
       FROM platform_models 
       ORDER BY sort_order ASC, created_at ASC`
    )

    return NextResponse.json({
      success: true,
      models: rows.map((r: any) => ({
        ...r,
        inputText: Boolean(r.inputText),
        inputImage: Boolean(r.inputImage),
        outputText: Boolean(r.outputText),
        outputImage: Boolean(r.outputImage),
        isActive: Boolean(r.isActive),
        isDefault: Boolean(r.isDefault),
        inputPricePerMillion: Number(r.inputPricePerMillion),
        outputPricePerMillion: Number(r.outputPricePerMillion),
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Add or update a model
export async function POST(req: Request) {
  if (!(await verifyAdminAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      id,
      name,
      provider = "openrouter",
      description = "",
      inputText = true,
      inputImage = false,
      outputText = true,
      outputImage = false,
      inputPricePerMillion = 60,
      outputPricePerMillion = 110,
      isActive = true,
      isDefault = false,
      sortOrder = 0,
    } = body

    if (!id || !id.trim()) {
      return NextResponse.json({ error: "Model ID / slug is required" }, { status: 400 })
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Model name is required" }, { status: 400 })
    }

    const cleanId = id.trim()
    const cleanName = name.trim()

    // If setting as default, unset other defaults
    if (isDefault) {
      await execute("UPDATE platform_models SET is_default = 0")
    }

    await execute(
      `INSERT INTO platform_models 
       (id, name, provider, description, input_text, input_image, output_text, output_image, input_price_per_million, output_price_per_million, is_active, is_default, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       provider = VALUES(provider),
       description = VALUES(description),
       input_text = VALUES(input_text),
       input_image = VALUES(input_image),
       output_text = VALUES(output_text),
       output_image = VALUES(output_image),
       input_price_per_million = VALUES(input_price_per_million),
       output_price_per_million = VALUES(output_price_per_million),
       is_active = VALUES(is_active),
       is_default = VALUES(is_default),
       sort_order = VALUES(sort_order)`,
      [
        cleanId,
        cleanName,
        provider,
        description || null,
        inputText ? 1 : 0,
        inputImage ? 1 : 0,
        outputText ? 1 : 0,
        outputImage ? 1 : 0,
        Number(inputPricePerMillion) || 0,
        Number(outputPricePerMillion) || 0,
        isActive ? 1 : 0,
        isDefault ? 1 : 0,
        Number(sortOrder) || 0,
      ]
    )

    return NextResponse.json({ success: true, message: `Model ${cleanName} saved successfully.` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove a model
export async function DELETE(req: Request) {
  if (!(await verifyAdminAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 })
    }

    if (id === "nobrain-1.5") {
      return NextResponse.json({ error: "The core default system model cannot be deleted." }, { status: 400 })
    }

    await execute("DELETE FROM platform_models WHERE id = ?", [id])
    return NextResponse.json({ success: true, message: `Model ${id} removed.` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

