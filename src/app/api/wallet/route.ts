import { NextRequest, NextResponse } from 'next/server'
import { walletService } from '@/lib/wallet'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const balance = await walletService.getBalance(user.id)
    const transactions = await walletService.getTransactions(user.id, 20)
    const pricing = walletService.getPricingConfig()

    return NextResponse.json({
      success: true,
      balance: Number(balance) || 0,
      transactions: transactions || [],
      pricing: {
        inputPerMillionPrice: Number(pricing.inputPerMillionPrice) || 10,
        outputPerMillionPrice: Number(pricing.outputPerMillionPrice) || 15,
        minimumRechargeAmount: Number(pricing.minimumRechargeAmount) || 500,
        prepaidOnly: Boolean(pricing.prepaidOnly),
      },
    })
  } catch (error: any) {
    console.error('Get wallet error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
