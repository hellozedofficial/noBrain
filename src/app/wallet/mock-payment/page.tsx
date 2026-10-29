"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, CheckCircle, XCircle, ShieldCheck } from "lucide-react"

export default function MockPaymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const transactionId = searchParams.get("transactionId") || ""
  const amount = searchParams.get("amount") || "0"
  const returnUrl = searchParams.get("returnUrl") || "/wallet"
  const cancelUrl = searchParams.get("cancelUrl") || "/wallet"

  const handleSuccess = async () => {
    setIsProcessing(true)
    // Simulate payment processing delay
    await new Promise((r) => setTimeout(r, 1500))
    // Redirect to success page (EPS would normally do this)
    window.location.href = returnUrl
  }

  const handleCancel = async () => {
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 800))
    window.location.href = cancelUrl
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* EPS-style header */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl">
          {/* Header bar */}
          <div className="bg-[#111] px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <div className="text-xs text-[#888] font-medium uppercase tracking-wider">
                EPS Secure Payment — SANDBOX
              </div>
              <div className="text-sm font-semibold text-white">
                noBrain AI Platform
              </div>
            </div>
          </div>

          {/* Amount display */}
          <div className="px-6 py-8 text-center border-b border-[#2a2a2a]">
            <div className="text-sm text-[#888] mb-1">Amount to Pay</div>
            <div className="text-4xl font-bold text-white">৳{parseFloat(amount).toFixed(2)}</div>
            <div className="text-xs text-[#555] mt-2">Bangladesh Taka (BDT)</div>
          </div>

          {/* Transaction details */}
          <div className="px-6 py-4 space-y-3 border-b border-[#2a2a2a]">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#666]">Transaction ID</span>
              <span className="text-[#aaa] font-mono text-xs">{transactionId.slice(0, 24)}...</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#666]">Merchant</span>
              <span className="text-[#aaa]">noBrain AI</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#666]">Mode</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                SANDBOX TEST
              </span>
            </div>
          </div>

          {/* Payment method mock */}
          <div className="px-6 py-5 space-y-3 border-b border-[#2a2a2a]">
            <div className="text-xs text-[#666] uppercase tracking-wider font-medium mb-3">
              Select Payment Method
            </div>
            {["bKash", "Nagad", "Rocket", "VISA / Mastercard"].map((method, i) => (
              <label
                key={method}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a] cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="method"
                  defaultChecked={i === 0}
                  className="accent-green-500"
                />
                <span className="text-sm text-[#ccc]">{method}</span>
              </label>
            ))}
          </div>

          {/* Action buttons */}
          <div className="px-6 py-5 flex flex-col gap-3">
            <button
              onClick={handleSuccess}
              disabled={isProcessing}
              className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isProcessing ? "Processing..." : `Confirm Payment — ৳${parseFloat(amount).toFixed(2)}`}
            </button>

            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="w-full py-3 rounded-lg bg-transparent border border-[#333] hover:border-[#444] text-[#888] hover:text-[#aaa] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancel Payment
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 text-center">
            <div className="text-xs text-[#444]">
              🔒 This is a sandbox simulation. No real money is charged.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
