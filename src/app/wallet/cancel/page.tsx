"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { XCircle, Loader2, ArrowLeft, Wallet } from 'lucide-react'
import Link from 'next/link'

function CancelPageContent() {
  const searchParams = useSearchParams()
  const merchantTransactionId = searchParams.get('merchantTransactionId')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!merchantTransactionId) { setDone(true); return }
    fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantTransactionId, cancelled: true }),
    }).finally(() => setDone(true))
  }, [merchantTransactionId])

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#ececec] flex flex-col">
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-6 bg-[#111] border-b border-[#1f1f1f] shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-semibold text-[#ececec] hover:text-white transition-colors no-underline">noBrain</Link>
          <span className="text-[#333]">/</span>
          <span className="text-sm text-[#888]">Payment</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
            {!done ? (
              <div className="p-10 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#444] mx-auto mb-4" />
                <p className="text-xs text-[#555]">Updating transaction status…</p>
              </div>
            ) : (
              <>
                <div className="p-8 text-center border-b border-[#1a1a1a]">
                  <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-yellow-400" />
                  </div>
                  <p className="text-xl font-bold text-white mb-1">Payment Cancelled</p>
                  <p className="text-xs text-[#555]">No amount was deducted from your account</p>
                </div>

                <div className="px-6 py-4 border-b border-[#1a1a1a]">
                  <div className="p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-lg text-xs text-yellow-400/80 text-center">
                    If this was a mistake, you can try again anytime.
                  </div>
                </div>

                <div className="p-5 flex gap-3">
                  <Link href="/wallet" className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold text-center transition-colors no-underline flex items-center justify-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Try Again
                  </Link>
                  <Link href="/" className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] text-[#ccc] text-sm font-medium text-center transition-colors no-underline">
                    Chat
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#444]" />
      </div>
    }>
      <CancelPageContent />
    </Suspense>
  )
}


