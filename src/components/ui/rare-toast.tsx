"use client"

import React, { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

export interface ToastItem {
  id: string
  title: string
  description?: string
  type: ToastType
}

type ToastListener = (toasts: ToastItem[]) => void

class ToastStore {
  private toasts: ToastItem[] = []
  private listeners: Set<ToastListener> = new Set()

  subscribe(listener: ToastListener) {
    this.listeners.add(listener)
    listener(this.toasts)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    this.listeners.forEach((l) => l([...this.toasts]))
  }

  add(title: string, options?: { description?: string; type?: ToastType }) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newToast: ToastItem = {
      id,
      title,
      description: options?.description,
      type: options?.type || "info",
    }
    this.toasts = [newToast, ...this.toasts].slice(0, 4)
    this.emit()

    setTimeout(() => {
      this.remove(id)
    }, 4000)
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.emit()
  }

  success(title: string, description?: string) {
    this.add(title, { description, type: "success" })
  }

  error(title: string, description?: string) {
    this.add(title, { description, type: "error" })
  }

  info(title: string, description?: string) {
    this.add(title, { description, type: "info" })
  }
}

export const rareToast = new ToastStore()

export function RareToaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    return rareToast.subscribe(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3",
            "bg-white/95 dark:bg-zinc-900/95 border-zinc-200/90 dark:border-zinc-800/90 text-zinc-900 dark:text-zinc-100",
            toast.type === "success" && "border-emerald-500/30 dark:border-emerald-500/30",
            toast.type === "error" && "border-rose-500/30 dark:border-rose-500/30"
          )}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )}
            {toast.type === "info" && (
              <Info className="w-4 h-4 text-blue-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold leading-tight">{toast.title}</div>
            {toast.description && (
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                {toast.description}
              </div>
            )}
          </div>

          <button
            onClick={() => rareToast.remove(toast.id)}
            className="shrink-0 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

