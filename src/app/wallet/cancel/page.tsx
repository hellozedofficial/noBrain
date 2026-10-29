"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { XCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function CancelPageContent() {
  const searchParams = useSearchParams()
  const merchantTransactionId = searchParams.get('merchantTransactionId')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!merchantTransactionId) { setDone(true); return }
    // Mark transaction as failed via API
    fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantTransactionId, cancelled: true }),
    }).finally(() => setDone(true))
  }, [merchantTransactionId])

  return (
    <div className="flex flex-col h-screen bg-background items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">
        {!done ? (
          <div className="text-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Updating transaction status…</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto mb-5 w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <XCircle className="w-9 h-9 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-500 mb-3">Payment Cancelled</p>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-6 text-sm text-yellow-600">
              You cancelled the payment. No amount was deducted from your account.
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              If this was a mistake, you can try again anytime.
            </p>
            <div className="flex gap-3">
              <Link href="/wallet" className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center hover:bg-primary/90 transition-colors">
                <ArrowLeft className="w-4 h-4 inline mr-1" />Try Again
              </Link>
              <Link href="/" className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-center hover:bg-sidebar-hover transition-colors text-foreground">
                Back to Chat
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CancelPageContent />
    </Suspense>
  )
}
