"use client"

import React, { useRef, useEffect, useCallback } from "react"
import { ArrowUp, Plus, Image as ImageIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { RaisedButton } from "@/components/ui/raised-button"
import { IosLoader } from "@/components/ui/ios-loader"

export interface AttachedImage {
  url: string
  name: string
}

interface GaiaComposerProps {
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  attachedImage?: AttachedImage | null
  onRemoveImage?: () => void
  onAttachImage?: (file: File) => void
  isUploading?: boolean
  className?: string
  maxRows?: number
}

export function GaiaComposer({
  value,
  onChange,
  onSubmit,
  placeholder = "Assign a task or talk to Copilot...",
  disabled = false,
  isLoading = false,
  attachedImage,
  onRemoveImage,
  onAttachImage,
  isUploading = false,
  className,
  maxRows = 6,
}: GaiaComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    const lineHeight = 22
    const maxHeight = lineHeight * maxRows
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${Math.max(newHeight, 38)}px`
  }, [value, maxRows])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if ((value.trim() || attachedImage) && !isLoading && !disabled) {
        onSubmit()
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onAttachImage) {
      onAttachImage(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const canSubmit = (Boolean(value.trim()) || Boolean(attachedImage)) && !isLoading && !disabled

  return (
    <div
      className={cn(
        "relative rounded-3xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/90 dark:border-zinc-700/60 p-2 shadow-sm transition-all focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-300 dark:focus-within:ring-zinc-600",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Image Thumbnail Preview Chip (GAIA UI Style) */}
      {attachedImage && (
        <div className="mb-2 px-1 flex items-center gap-2">
          <div className="relative group flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 shadow-sm animate-in fade-in slide-in-from-bottom-1">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
              <img
                src={attachedImage.url}
                alt={attachedImage.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 max-w-[180px]">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {attachedImage.name}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Attached image</div>
            </div>
            {onRemoveImage && (
              <button
                type="button"
                onClick={onRemoveImage}
                title="Remove image"
                className="ml-1 p-1 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
      />

      {/* Bottom Bar Controls */}
      <div className="flex items-center justify-between pt-1 px-1">
        {/* Attach Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading || isUploading}
            title="Attach image"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <IosLoader size="sm" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Circular GAIA Raised Send Button */}
        <RaisedButton
          type="button"
          size="iconRound"
          variant="primary"
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-label="Send message"
          className={cn(
            "!h-8 !w-8 transition-transform",
            canSubmit ? "opacity-100 scale-100" : "opacity-40 scale-95 pointer-events-none"
          )}
        >
          {isLoading ? (
            <IosLoader size="sm" color="#ffffff" />
          ) : (
            <ArrowUp className="w-4 h-4 text-white stroke-[2.5]" />
          )}
        </RaisedButton>
      </div>
    </div>
  )
}

