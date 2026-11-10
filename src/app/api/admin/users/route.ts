import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { walletService } from "@/lib/wallet"

export async function GET() {
  try {
    const users = await query<any>(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.last_used_model, 
        u.created_at,
        COALESCE(w.balance, 0.00) as wallet_balance
      FROM users u
      LEFT JOIN wallets w ON u.id = w.userId
      ORDER BY u.created_at DESC
      LIMIT 100
    `)

    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId, amount, type, description } = await req.json()

    if (!userId || !amount || !type) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const numAmount = Math.abs(parseFloat(amount))
    const refId = `ADMIN-ADJUST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    const tx = await walletService.addTransaction(
      userId,
      numAmount,
      type === "debit" ? "debit" : "credit",
      description || "Admin Balance Adjustment",
      refId,
      "completed",
      { adjustedBy: "admin_hq", timestamp: new Date().toISOString() }
    )

    const newBalance = await walletService.getBalance(userId)

    return NextResponse.json({
      success: true,
      message: `Successfully ${type === "debit" ? "debited" : "credited"} BDT ${numAmount.toFixed(2)}`,
      transaction: tx,
      newBalance,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

