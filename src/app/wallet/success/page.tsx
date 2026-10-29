"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function SuccessPageContent() {
  const searchParams = useSearchParams()

  // EPS sends PascalCase: MerchantTransactionId, EPSTransactionId, Status
  const merchantTransactionId =
    searchParams.get('MerchantTransactionId') ||
    searchParams.get('merchantTransactionId') ||
    searchParams.get('merchant_transaction_id')

  const epsStatus = searchParams.get('Status') || searchParams.get('status')
  const epsTransactionId = searchParams.get('EPSTransactionId') || searchParams.get('EPSTransactionId ')?.trim()

  const [isProcessing, setIsProcessing] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    // If EPS already tells us it's success via Status param, verify with backend
    if (!merchantTransactionId) {
      setError('Transaction ID not found in callback')
      setIsProcessing(false)
      return
    }
    verifyPayment()
  }, [merchantTransactionId])

  const verifyPayment = async () => {
    try {
      const res = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantTransactionId }),
      })
      const data = await res.json()

      if (data.success) {
        setDetails(data)
        setIsSuccess(true)
      } else {
        setError(data.error || 'Payment verification failed')
        setIsSuccess(false)
      }
    } catch {
      setError('Payment verification failed. Please check your wallet balance.')
      setIsSuccess(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (v: string | number) =>
    `৳${parseFloat(String(v || 0)).toFixed(2)}`

  return (
    <div className="flex flex-col h-screen bg-background items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">
        {merchantTransactionId && (
          <div className="text-center mb-4 text-xs text-muted-foreground font-mono">
            Ref: {merchantTransactionId}
          </div>
        )}

        {isProcessing ? (
          <div className="text-center py-10">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-1">Verifying Payment</p>
            <p className="text-sm text-muted-foreground">Please wait…</p>
          </div>
        ) : isSuccess ? (
          <div className="text-center py-6">
            <div className="mx-auto mb-5 w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-500 mb-4">Payment Successful!</p>

            {details && (
              <div className="space-y-2 mb-6 text-sm text-left">
                {details.amount && (
                  <div className="flex justify-between border-b border-border py-2">
                    <span className="text-muted-foreground">Amount Added</span>
                    <span className="font-bold text-foreground">{formatCurrency(details.amount)}</span>
                  </div>
                )}
                {details.paymentMethod && (
                  <div className="flex justify-between border-b border-border py-2">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="text-foreground">{details.paymentMethod}</span>
                  </div>
                )}
                {(epsTransactionId || details.epsTransactionId) && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">EPS Txn ID</span>
                    <span className="font-mono text-xs text-foreground">
                      {epsTransactionId || details.epsTransactionId}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-6 text-sm text-green-500">
              Your wallet has been credited. You can now use noBrain AI.
            </div>
            <div className="flex gap-3">
              <Link href="/wallet" className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center hover:bg-primary/90 transition-colors">
                Go to Wallet
              </Link>
              <Link href="/" className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-center hover:bg-sidebar-hover transition-colors text-foreground">
                Start Chatting
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="mx-auto mb-5 w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-500 mb-4">Payment Failed</p>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-6 text-sm text-red-500">
                {error}
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">No amount was deducted. Please try again.</p>
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

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
}
