import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getActiveSaleonicClient } from "@/lib/saleonic/service"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ itemCode: string }> }
) {
  try {
    const { itemCode } = await params
    const user = await getCurrentUser()
    const client = await getActiveSaleonicClient(user?.id)

    const res = await client.getProduct(itemCode)
    return NextResponse.json(res)
  } catch (error: any) {
    console.error("Saleonic get product error:", error)
    return NextResponse.json(
      { error: error.message, details: error.errors || null },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemCode: string }> }
) {
  try {
    const { itemCode } = await params
    const user = await getCurrentUser()
    const client = await getActiveSaleonicClient(user?.id)

    const res = await client.deleteProduct(itemCode)
    return NextResponse.json(res)
  } catch (error: any) {
    console.error("Saleonic delete product error:", error)
    return NextResponse.json(
      { error: error.message, details: error.errors || null },
      { status: error.status || 500 }
    )
  }
}
