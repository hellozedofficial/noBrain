import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
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
        is_default as isDefault 
       FROM platform_models 
       WHERE is_active = 1 
       ORDER BY sort_order ASC, name ASC`
    )

    const models = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      description: r.description,
      inputText: Boolean(r.inputText),
      inputImage: Boolean(r.inputImage),
      outputText: Boolean(r.outputText),
      outputImage: Boolean(r.outputImage),
      inputPricePerMillion: Number(r.inputPricePerMillion),
      outputPricePerMillion: Number(r.outputPricePerMillion),
      isDefault: Boolean(r.isDefault),
    }))

    return NextResponse.json({ success: true, models })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

