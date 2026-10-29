import { NextRequest, NextResponse } from 'next/server'
import { epsService } from '@/lib/eps'
import { query, execute } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { merchantTransactionId, cancelled } = body

    if (!merchantTransactionId) {
      return NextResponse.json(
        { success: false, error: 'merchantTransactionId is required' },
        { status: 400 }
      )
    }

    // If user explicitly cancelled
    if (cancelled) {
      await execute(
        "UPDATE transactions SET status = 'failed' WHERE referenceId = ? AND status = 'pending'",
        [merchantTransactionId]
      ).catch(() => {})
      return NextResponse.json({ success: false, error: 'Payment cancelled by user' })
    }

    // ── ATOMIC LOCK ────────────────────────────────────────────────────────────
    // Only one concurrent request will succeed (pending → completed).
    // This prevents double-credit even if EPS calls successUrl twice.
    const lockResult = await execute(
      "UPDATE transactions SET status = 'completed' WHERE referenceId = ? AND status = 'pending'",
      [merchantTransactionId]
    )
    const affectedRows = lockResult?.affectedRows ?? 0

    if (affectedRows === 0) {
      // Either already processed or not found
      const existing = await query<any>(
        'SELECT id, amount, status FROM transactions WHERE referenceId = ?',
        [merchantTransactionId]
      )
      if (existing.length > 0 && existing[0].status === 'completed') {
        // Already done — return success without crediting again
        return NextResponse.json({
          success: true,
          amount: String(existing[0].amount),
          alreadyProcessed: true,
          merchantTransactionId,
        })
      }
      // Not in DB at all — fall through to EPS verify
    }

    // ── Verify with EPS ────────────────────────────────────────────────────────
    const verification = await epsService.verifyPayment(merchantTransactionId)

    if (verification.success && verification.status === 'Success') {
      if (affectedRows > 0) {
        // We own the lock — credit the wallet NOW
        const txns = await query<any>(
          'SELECT t.amount, w.id as wid FROM transactions t JOIN wallets w ON t.walletId = w.id WHERE t.referenceId = ?',
          [merchantTransactionId]
        )
        if (txns.length > 0) {
          await execute(
            'UPDATE wallets SET balance = balance + ? WHERE id = ?',
            [txns[0].amount, txns[0].wid]
          )
        }
      }

      return NextResponse.json({
        success: true,
        amount: verification.amount,
        paymentMethod: verification.paymentMethod,
        paymentDate: verification.paymentDate,
        epsTransactionId: verification.epsTransactionId,
        merchantTransactionId,
      })

    } else {
      // Payment failed — revert status
      if (affectedRows > 0) {
        await execute(
          "UPDATE transactions SET status = 'failed' WHERE referenceId = ?",
          [merchantTransactionId]
        ).catch(() => {})
      }
      return NextResponse.json({
        success: false,
        error: verification.error || 'Payment verification failed',
      })
    }
  } catch (error: any) {
    console.error('Verify payment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
