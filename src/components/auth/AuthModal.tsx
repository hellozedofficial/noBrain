"use client"

import React, { useState } from "react"
import { X, Loader2 } from "lucide-react"

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

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login"
    const payload = isRegister ? { name, email, password } : { email, password }

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
            {isRegister ? "Create your account" : "Welcome back to noBrain"}
          </h2>
          <p className="text-xs text-muted">
            {isRegister
              ? "Sign up to track your chat history and models"
              : "Log in with your email and password"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-500 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
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
            <label className="text-xs font-medium text-muted">Password</label>
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
            <span>{isRegister ? "Create Account" : "Log In"}</span>
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="text-center pt-1 text-xs text-muted">
          {isRegister ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setError("")
                  setIsRegister(false)
                }}
                className="text-foreground hover:underline font-medium cursor-pointer"
              >
                Log In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setError("")
                  setIsRegister(true)
                }}
                className="text-foreground hover:underline font-medium cursor-pointer"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
