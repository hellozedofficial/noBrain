"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Check, ShieldCheck, Mail, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Lock } from "lucide-react"

function GoogleLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  )
}

function GoogleConsentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const state = searchParams.get("state") || ""
  const redirectUri = searchParams.get("redirect_uri") || "/api/auth/google/callback"
  const defaultUserEmail = searchParams.get("user_email") || ""

  const [selectedEmail, setSelectedEmail] = useState(defaultUserEmail || "user@gmail.com")
  const [customEmail, setCustomEmail] = useState("")
  const [useOther, setUseOther] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeEmail = (useOther ? customEmail : selectedEmail).trim() || "user@gmail.com"

  const handleAuthorize = () => {
    setIsSubmitting(true)
    const callbackUrl = new URL(redirectUri, window.location.origin)
    callbackUrl.searchParams.set("code", `simulated_auth_${Date.now()}`)
    callbackUrl.searchParams.set("state", state)
    callbackUrl.searchParams.set("email", activeEmail)
    callbackUrl.searchParams.set("name", activeEmail.split("@")[0])

    window.location.href = callbackUrl.toString()
  }

  return (
    <div className="min-h-screen bg-[#202124] text-[#e8eaed] flex items-center justify-center p-4 selection:bg-[#4285f4] selection:text-white font-sans">
      <div className="w-full max-w-[460px] bg-[#292a2d] border border-[#3c4043] rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Header with Google Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-white rounded-full shadow-sm mb-1">
            <GoogleLogo className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-medium text-white tracking-tight">Sign in with Google</h1>
          <p className="text-sm text-[#9aa0a6]">
            Choose an account to connect Gmail with <strong className="text-white">noBrain Copilot</strong>
          </p>
        </div>

        {/* Account Selector */}
        <div className="space-y-2">
          <div
            onClick={() => setUseOther(false)}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              !useOther
                ? "bg-[#303134] border-[#8ab4f8] ring-1 ring-[#8ab4f8]"
                : "bg-[#292a2d] border-[#3c4043] hover:bg-[#303134]"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#8ab4f8] text-[#202124] flex items-center justify-center font-bold text-sm shrink-0">
                {(defaultUserEmail || "G")[0].toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-sm font-medium text-white truncate">
                  {defaultUserEmail ? defaultUserEmail.split("@")[0] : "Google Account"}
                </div>
                <div className="text-xs text-[#9aa0a6] truncate">{defaultUserEmail || "user@gmail.com"}</div>
              </div>
            </div>
            {!useOther && <CheckCircle2 className="w-5 h-5 text-[#8ab4f8] shrink-0" />}
          </div>

          <div
            onClick={() => setUseOther(true)}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              useOther
                ? "bg-[#303134] border-[#8ab4f8] ring-1 ring-[#8ab4f8]"
                : "bg-[#292a2d] border-[#3c4043] hover:bg-[#303134]"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#3c4043] text-white flex items-center justify-center font-bold text-sm shrink-0">
                +
              </div>
              <div className="text-sm font-medium text-white">Use another Google account</div>
            </div>
            {useOther && <CheckCircle2 className="w-5 h-5 text-[#8ab4f8] shrink-0" />}
          </div>

          {useOther && (
            <div className="pt-2 animate-in fade-in duration-150">
              <input
                type="email"
                placeholder="Enter your Gmail address"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#202124] border border-[#5f6368] focus:border-[#8ab4f8] text-sm text-white placeholder-[#80868b] outline-none"
              />
            </div>
          )}
        </div>

        {/* Permissions Requested */}
        <div className="p-4 rounded-2xl bg-[#202124]/70 border border-[#3c4043] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#e8eaed] uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span>Permissions Requested by noBrain</span>
          </div>

          <div className="space-y-2 text-xs text-[#9aa0a6]">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#81c995] shrink-0 mt-0.5" />
              <span>Send and draft emails on your behalf when requested in Copilot chats and squad rooms.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#81c995] shrink-0 mt-0.5" />
              <span>Read, create, search, and synchronize files and folders in Google Drive.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#81c995] shrink-0 mt-0.5" />
              <span>Verify your primary Google email address and identity.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-[#8ab4f8] hover:bg-[#8ab4f8]/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAuthorize}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8ab4f8] text-[#202124] text-sm font-medium hover:bg-[#aecbfa] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <span>{isSubmitting ? "Authorizing..." : "Continue"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Developer Info Footer */}
        <div className="text-[11px] text-[#80868b] border-t border-[#3c4043] pt-4 text-center leading-relaxed">
          To connect directly to production Google Cloud OAuth, set <code className="text-[#8ab4f8] font-mono">GOOGLE_CLIENT_ID</code> and <code className="text-[#8ab4f8] font-mono">GOOGLE_CLIENT_SECRET</code> in <code className="text-[#e8eaed] font-mono">.env.local</code>.
        </div>
      </div>
    </div>
  )
}

export default function GoogleConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#202124] flex items-center justify-center text-white">Loading Google OAuth...</div>}>
      <GoogleConsentContent />
    </Suspense>
  )
}

