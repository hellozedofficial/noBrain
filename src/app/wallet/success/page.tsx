"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, ArrowLeft, Wallet } from 'lucide-react'
import Link from 'next/link'

function SuccessPageContent() {
  const searchParams = useSearchParams()

  const merchantTransactionId =
    searchParams.get('MerchantTransactionId') ||
    searchParams.get('merchantTransactionId') ||
    searchParams.get('merchant_transaction_id')

  const epsTransactionId =
    searchParams.get('EPSTransactionId') ||
    searchParams.get('EPSTransactionId ')?.trim()

  const [isProcessing, setIsProcessing] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    if (!merchantTransactionId) {
      setError('Transaction ID not found in callback')
      setIsProcessing(false)
      return
    }
    fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantTransactionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) { setDetails(data); setIsSuccess(true) }
        else setError(data.error || 'Payment verification failed')
      })
      .catch(() => setError('Payment verification failed. Please check your wallet balance.'))
      .finally(() => setIsProcessing(false))
  }, [merchantTransactionId])

  const fmt = (v: any) => `৳${parseFloat(String(v || 0)).toFixed(2)}`

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
            {isProcessing ? (
              <div className="p-10 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#444] mx-auto mb-4" />
                <p className="text-sm font-medium text-white mb-1">Verifying Payment</p>
                <p className="text-xs text-[#555]">Please wait…</p>
              </div>
            ) : isSuccess ? (
              <>
                <div className="p-8 text-center border-b border-[#1a1a1a]">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-xl font-bold text-white mb-1">Payment Successful</p>
                  <p className="text-xs text-[#555]">Your wallet has been credited</p>
                </div>

                {details && (
                  <div className="px-6 py-4 space-y-3 border-b border-[#1a1a1a]">
                    {details.amount && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#666]">Amount Added</span>
                        <span className="text-sm font-bold text-green-400">{fmt(details.amount)}</span>
                      </div>
                    )}
                    {details.paymentMethod && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#666]">Method</span>
                        <span className="text-xs text-[#aaa]">{details.paymentMethod}</span>
                      </div>
                    )}
                    {(epsTransactionId || details.epsTransactionId) && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#666]">EPS Txn ID</span>
                        <span className="text-[10px] font-mono text-[#555]">
                          {(epsTransactionId || details.epsTransactionId)?.slice(0, 20)}...
                        </span>
                      </div>
                    )}
                    {merchantTransactionId && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#666]">Ref</span>
                        <span className="text-[10px] font-mono text-[#555]">{merchantTransactionId.slice(0, 20)}...</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 flex gap-3">
                  <Link href="/wallet" className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold text-center transition-colors no-underline flex items-center justify-center gap-1.5">
                    <Wallet className="h-4 w-4" /> Go to Wallet
                  </Link>
                  <Link href="/" className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] text-[#ccc] text-sm font-medium text-center transition-colors no-underline">
                    Start Chatting
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="p-8 text-center border-b border-[#1a1a1a]">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-xl font-bold text-white mb-1">Payment Failed</p>
                  <p className="text-xs text-[#555]">No amount was deducted</p>
                </div>

                {error && (
                  <div className="mx-5 mt-4 p-3 bg-red-500/8 border border-red-500/20 rounded-lg text-xs text-red-400">
                    {error}
                  </div>
                )}

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

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#444]" />
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
}


