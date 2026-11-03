"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${Math.max(0.1, Number(seconds.toFixed(1)))}s`
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

interface AiStatusProps {
  status?: "thinking" | "working" | "idle" | "done"
  statusText?: string
  durationSeconds?: number | null
  reasoning?: string | null
  isStreaming?: boolean
  elapsedSeconds?: number
  className?: string
}

export function AiStatus({
  status = "done",
  statusText,
  durationSeconds,
  reasoning,
  isStreaming = false,
  elapsedSeconds = 0,
  className,
}: AiStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyReasoning = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!reasoning) return
    navigator.clipboard.writeText(reasoning)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Active generation / thinking state (Plain RareUI Text Shimmer - No Chips/Pills)
  if (isStreaming || status === "thinking" || status === "working") {
    const defaultLabel =
      status === "working"
        ? "Executing workspace task..."
        : statusText || "Thinking..."

    return (
      <div className={cn("inline-flex items-center gap-2 text-xs select-none py-1 mb-1", className)}>
        <span className="animate-text-shimmer font-medium text-xs">
          {defaultLabel}
        </span>
        <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[11px]">
          {formatDuration(elapsedSeconds)}
        </span>
      </div>
    )
  }

  // Completed State: "Worked for {the time}s >" (Plain Text matching user screenshot)
  const time = durationSeconds ?? elapsedSeconds
  if (!time && !reasoning) return null

  const displayTime = time ? formatDuration(time) : null

  return (
    <div className={cn("flex flex-col select-none mb-1.5", className)}>
      <button
        type="button"
        onClick={() => reasoning && setIsExpanded(!isExpanded)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors text-left py-0.5",
          reasoning ? "cursor-pointer" : "cursor-default"
        )}
      >
        <span className="font-normal text-xs">
          {displayTime ? `Worked for ${displayTime}` : "Thought Process"}
        </span>

        {reasoning && (
          <span className="text-zinc-400 dark:text-zinc-500">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
            )}
          </span>
        )}
      </button>

      {/* Expandable Reasoning Details (Plain minimal thought process) */}
      {isExpanded && reasoning && (
        <div className="mt-1 mb-2 pl-3 border-l-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
              Reasoning
            </span>
            <button
              type="button"
              onClick={handleCopyReasoning}
              className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="whitespace-pre-wrap select-text font-mono text-[11px] max-h-56 overflow-y-auto">
            {reasoning}
          </div>
        </div>
      )}
    </div>
  )
}
