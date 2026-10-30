"use client"

import React, { useState } from "react"
import { X, Loader2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react"

export interface User {
  id: string
  name: string
  email: string
  last_used_model: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: User) => void
}

type AuthMode = "login" | "register" | "forgot" | "reset"

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  if (!isOpen) return null

  const switchMode = (newMode: AuthMode) => {
    setError("")
    setSuccessMessage("")
    setMode(newMode)
  }

  // Handle Login & Register
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login"
    const payload = mode === "register" ? { name, email, password } : { email, password }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed")
      }

      onSuccess(data.user)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Requesting OTP Code
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset code")
      }

      setSuccessMessage(data.message || "A 6-digit reset code has been sent to your email.")
      setMode("reset")
      setResendCooldown(60)

      // Start countdown
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Reset Password with OTP
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password")
      }

      setSuccessMessage("Password reset successfully! Please log in with your new password.")
      setMode("login")
      setPassword("")
      setOtp("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code")
      }

      setSuccessMessage("A fresh 6-digit reset code has been sent to your email.")
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-sm rounded-2xl bg-card-bg border border-border-subtle p-6 text-foreground shadow-2xl space-y-5">
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
            {mode === "register" && "Create your account"}
            {mode === "login" && "Welcome back to noBrain"}
            {mode === "forgot" && "Reset your password"}
            {mode === "reset" && "Enter verification code"}
          </h2>
          <p className="text-xs text-muted">
            {mode === "register" && "Sign up to track your chat history and models"}
            {mode === "login" && "Log in with your email and password"}
            {mode === "forgot" && "Enter your email to receive a 6-digit reset code"}
            {mode === "reset" && `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-500 text-center">
            {error}
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-500 text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. Login / Register Forms */}
        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {mode === "register" && (
              <div className="space-y-1 text-left">
                <label className="text-xs font-medium text-muted">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors"
                />
              </div>
            )}

            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted">Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-muted hover:text-foreground transition-colors hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-foreground text-background hover:opacity-90 font-medium py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{mode === "register" ? "Create Account" : "Log In"}</span>
            </button>
          </form>
        )}

        {/* 2. Forgot Password Form (Request OTP) */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-muted">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-foreground text-background hover:opacity-90 font-medium py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Send Reset Code</span>
            </button>
          </form>
        )}

        {/* 3. Reset Password Form (Enter OTP & New Password) */}
        {mode === "reset" && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-muted">6-digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-center text-lg font-mono tracking-widest text-foreground placeholder:text-muted/40 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-muted">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-muted">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-xl bg-input-bg border border-input-border focus:border-muted px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted pt-1">
              <span>Didn't get code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className="text-foreground hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-foreground text-background hover:opacity-90 font-medium py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Reset Password</span>
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="text-center pt-1 text-xs text-muted">
          {mode === "register" && (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-foreground hover:underline font-medium cursor-pointer"
              >
                Log In
              </button>
            </span>
          )}

          {mode === "login" && (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-foreground hover:underline font-medium cursor-pointer"
              >
                Sign Up
              </button>
            </span>
          )}

          {(mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="inline-flex items-center gap-1.5 text-foreground hover:underline font-medium cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Log In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
