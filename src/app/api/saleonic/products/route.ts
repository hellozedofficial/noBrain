import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getActiveSaleonicClient } from "@/lib/saleonic/service"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    const client = await getActiveSaleonicClient(user?.id)

    const url = new URL(req.url)
    const search = url.searchParams.get("search") || undefined
    const category_id = url.searchParams.get("category_id")
      ? Number(url.searchParams.get("category_id"))
      : undefined
    const brand_id = url.searchParams.get("brand_id")
      ? Number(url.searchParams.get("brand_id"))
      : undefined
    const limit = url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : undefined
    const page = url.searchParams.get("page")
      ? Number(url.searchParams.get("page"))
      : undefined

    const res = await client.getProducts({
      search,
      category_id,
      brand_id,
      limit,
      page,
    })

    return NextResponse.json(res)
  } catch (error: any) {
    console.error("Saleonic products GET error:", error)
    return NextResponse.json(
      { error: error.message, details: error.errors || null },
      { status: error.status || 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const client = await getActiveSaleonicClient(user?.id)
    const body = await req.json().catch(() => ({}))

    const res = await client.saveProduct(body)
    return NextResponse.json(res)
  } catch (error: any) {
    console.error("Saleonic products POST error:", error)
    return NextResponse.json(
      { error: error.message, details: error.errors || null },
      { status: error.status || 400 }
    )
  }
}
