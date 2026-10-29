import { NextRequest, NextResponse } from 'next/server'
import { walletService } from '@/lib/wallet'
import { epsService } from '@/lib/eps'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const userId = user.id

    const body = await request.json()
    const { action, amount } = body

    if (action !== 'recharge') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    // Validate amount
    const validation = walletService.validateRechargeAmount(amount)
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.message }, { status: 400 })
    }

    // Use APP_URL env var (must match EPS registered domain).
    // Falls back to request origin header, then localhost for local dev.
    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXTAUTH_URL ||
      (request.headers.get('origin') ?? 'http://localhost:3000')

    // Initiate EPS payment FIRST — only save to DB after we have a real merchantTransactionId
    const epsResponse = await epsService.initiateTransaction({
      amount,
      customerName: user.name || 'noBrain User',
      customerEmail: user.email || 'user@nobrain.ai',
      customerMobile: '01700000000',
      orderId: `ORD-${Date.now()}-${user.id}`,
      successUrl: `${baseUrl}/wallet/success`,
      failUrl:    `${baseUrl}/wallet/cancel`,
      cancelUrl:  `${baseUrl}/wallet/cancel`,
      description: `noBrain Wallet Recharge - BDT ${amount}`,
    })

    if (!epsResponse.success || !epsResponse.paymentUrl) {
      return NextResponse.json(
        { success: false, error: epsResponse.error || 'EPS gateway error. Please try again.' },
        { status: 502 }
      )
    }

    // Save ONE pending transaction with the real EPS merchantTransactionId
    await walletService.addTransaction(
      user.id, amount, 'credit',
      `Recharge of BDT ${amount}`,
      epsResponse.merchantTransactionId,
      'pending',
      { epsTransactionId: epsResponse.epsTransactionId }
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      merchantTransactionId: epsResponse.merchantTransactionId,
      paymentUrl: epsResponse.paymentUrl,
      message: 'Redirecting to EPS payment page',
    })
  } catch (error: any) {
    console.error('Wallet recharge API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Payment initiation failed' },
      { status: 500 }
    )
  }
}
