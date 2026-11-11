"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Eye, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ModelOption {
  id: string
  name: string
  provider?: string
  description?: string
  inputText?: boolean
  inputImage?: boolean
  outputText?: boolean
  outputImage?: boolean
  inputPricePerMillion?: number
  outputPricePerMillion?: number
  isDefault?: boolean
}

export const DEFAULT_FALLBACK_MODELS: ModelOption[] = [
  {
    id: "nobrain-1.5",
    name: "noBrain 1.5",
    description: "Primary high-performance neural engine with deep reasoning & Bengali fluency",
    inputText: true,
    inputImage: true,
    outputText: true,
    outputImage: false,
    inputPricePerMillion: 60,
    outputPricePerMillion: 110,
    isDefault: true,
  },
]

interface ModelSelectorProps {
  selectedModel: string
  onSelectModel: (modelId: string) => void
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_FALLBACK_MODELS)
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    async function loadModels() {
      try {
        const res = await fetch("/api/models")
        if (res.ok) {
          const data = await res.json()
          if (data.models && data.models.length > 0 && isMounted) {
            setModels(data.models)
          }
        }
      } catch (err) {
        console.error("Failed to fetch platform models:", err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadModels()
    return () => {
      isMounted = false
    }
  }, [])

  const current =
    models.find((m) => m.id === selectedModel) ||
    models.find((m) => m.isDefault) ||
    models[0] ||
    DEFAULT_FALLBACK_MODELS[0]

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
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-sidebar-hover text-sm font-semibold text-foreground transition-colors cursor-pointer select-none group border border-transparent hover:border-border-subtle"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-foreground tracking-tight">{current.name}</span>
          {current.inputImage && (
            <span title="Vision Enabled" className="inline-flex items-center text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded font-medium">
              <Eye className="w-3 h-3 mr-0.5" />
              Vision
            </span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted transition-transform group-hover:text-foreground" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-84 rounded-2xl bg-card-bg border border-border-subtle shadow-xl dark:shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider border-b border-border-subtle mb-1">
            <span>Select AI Model</span>
            <span className="text-[10px] text-muted">{models.length} available</span>
          </div>

          <div className="space-y-1 px-1.5 max-h-[380px] overflow-y-auto custom-scrollbar">
            {models.map((model) => {
              const isSelected = model.id === current.id

              return (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "flex items-start justify-between p-2.5 rounded-xl cursor-pointer transition-all text-left",
                    isSelected
                      ? "bg-sidebar-hover text-foreground font-medium border border-border-subtle shadow-xs"
                      : "hover:bg-sidebar-hover/60 text-foreground/85 hover:text-foreground border border-transparent"
                  )}
                >
                  <div className="flex flex-col min-w-0 pr-2 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">
                        {model.name}
                      </span>
                      {model.inputImage && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" />
                          Vision
                        </span>
                      )}
                      {model.outputImage && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          Image Gen
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <span className="text-[11px] text-muted line-clamp-1 pt-0.5">
                        {model.description}
                      </span>
                    )}
                    {model.inputPricePerMillion != null && (
                      <span className="text-[10px] text-muted pt-0.5">
                        BDT {model.inputPricePerMillion} / {model.outputPricePerMillion} per 1M tokens
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 ml-1" />
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
