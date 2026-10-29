"use client"

import React, { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfigChange?: (isConnected: boolean) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  onConfigChange,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("")
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const [isConnected, setIsConnected] = useState(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!isOpen) return

    setSuccessMsg("")
    setErrorMsg("")
    setApiKey("")
    setIsLoadingStatus(true)

    fetch("/api/saleonic/config")
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(Boolean(data.isConnected))
        setMaskedKey(data.maskedKey || null)
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingStatus(false)
      })
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg("")
    setErrorMsg("")

    if (!apiKey.trim()) {
      setErrorMsg("Please enter your Saleonic API key.")
      return
    }

    setIsTesting(true)

    try {
      const res = await fetch("/api/saleonic/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to connect to Saleonic.")
      }

      setIsConnected(true)
      setMaskedKey(
        apiKey.length > 12
          ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
          : "********"
      )
      setSuccessMsg(data.message || "Saleonic connected successfully!")
      setApiKey("")
      if (onConfigChange) onConfigChange(true)
    } catch (err: any) {
      setErrorMsg(err.message || "Connection failed. Please check your API key.")
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    setSuccessMsg("")
    setErrorMsg("")
    setIsDisconnecting(true)

    try {
      const res = await fetch("/api/saleonic/config", {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to disconnect.")
      }

      setIsConnected(false)
      setMaskedKey(null)
      setApiKey("")
      setSuccessMsg("Saleonic disconnected.")
      if (onConfigChange) onConfigChange(false)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-sm rounded-2xl bg-card-bg border border-border-subtle p-6 text-foreground shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors p-1 rounded-md cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {isConnected ? "Saleonic Settings" : "Connect Saleonic"}
          </h2>
          <p className="text-xs text-muted">
            {isConnected
              ? "Your Saleonic store is connected and active"
              : "Enter your API key to connect your store"}
          </p>
        </div>

        {/* Loading status */}
        {isLoadingStatus ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading settings...</span>
          </div>
        ) : (
          <>
            {/* Connected Status Pill */}
            {isConnected && maskedKey && (
              <div className="rounded-xl bg-input-bg border border-input-border px-3.5 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-foreground">Connected</span>
                </div>
                <span className="font-mono text-muted text-[11px]">{maskedKey}</span>
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-500 text-center">
                {successMsg}
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-500 text-center">
                {errorMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted">
                    {isConnected ? "Update API Key" : "API Key"}
                  </label>
                  <a
                    href="https://saleonic.com/admin/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted hover:text-foreground transition-colors"
                  >
                    Get Key ↗
                  </a>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    isConnected ? "Enter new API key to replace..." : "sal_live_..."
                  }
                  className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isTesting || !apiKey.trim()}
                className="w-full rounded-xl bg-foreground text-background hover:opacity-90 font-medium py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
              >
                {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {isTesting
                    ? "Connecting..."
                    : isConnected
                    ? "Update Key"
                    : "Connect Store"}
                </span>
              </button>
            </form>

            {/* Disconnect Action */}
            {isConnected && (
              <div className="text-center pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="text-red-500 hover:text-red-400 hover:underline font-medium cursor-pointer transition-colors"
                >
                  {isDisconnecting ? "Disconnecting..." : "Disconnect Saleonic"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
