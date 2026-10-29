"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ModelOption {
  id: string
  name: string
  provider: string
  badge?: string
  description?: string
  isExternal?: boolean
}

export const APP_MODEL_ID = "nobrain-1.5"

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: APP_MODEL_ID,
    name: "noBrain 1.5",
    provider: "noBrain AI",
    badge: "v1.5",
    description: "Next-gen intelligent neural assistant with deep reasoning & Bengali fluency",
    isExternal: false,
  },
]

interface ModelSelectorProps {
  selectedModel: string
  onSelectModel: (modelId: string) => void
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const current =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0]

  useEffect(() => {
    if (selectedModel !== APP_MODEL_ID) {
      onSelectModel(APP_MODEL_ID)
    }
  }, [selectedModel, onSelectModel])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-sidebar-hover text-sm font-semibold text-foreground transition-colors cursor-pointer select-none"
      >
        <span className="text-foreground tracking-tight">{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 rounded-2xl bg-card-bg border border-border-subtle shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-1 flex items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider">
            <span>Active Model</span>
          </div>

          <div className="space-y-0.5 px-1.5 mt-1 max-h-[380px] overflow-y-auto custom-scrollbar">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = model.id === current.id
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "flex items-start justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-left",
                    isSelected
                      ? "bg-sidebar-hover text-foreground font-medium"
                      : "hover:bg-sidebar-hover/80 text-foreground/80 hover:text-foreground"
                  )}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground truncate">
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-user-bubble text-muted font-mono shrink-0">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <span className="text-[11px] text-muted truncate pt-0.5">
                        {model.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
