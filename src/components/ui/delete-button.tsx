"use client"

import React, { useState, useEffect, useRef } from "react"
import { Trash2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { IosLoader } from "./ios-loader"

interface DeleteButtonProps {
  onDelete: () => Promise<void> | void
  label?: string
  size?: "sm" | "default" | "icon"
  className?: string
  disabled?: boolean
}

export function DeleteButton({
  onDelete,
  label = "Delete",
  size = "icon",
  className,
  disabled = false,
}: DeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-close confirmation after 4 seconds
  useEffect(() => {
    if (!isConfirming) return
    const timer = setTimeout(() => {
      setIsConfirming(false)
    }, 4500)
    return () => clearTimeout(timer)
  }, [isConfirming])

  // Click outside listener
  useEffect(() => {
    if (!isConfirming) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsConfirming(false)
      }
    }
    window.addEventListener("mousedown", handleOutsideClick)
    return () => window.removeEventListener("mousedown", handleOutsideClick)
  }, [isConfirming])

  const handleOpenConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (disabled || isDeleting) return
    setIsConfirming(true)
  }

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (disabled || isDeleting) return

    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsConfirming(false)
  }

  if (isConfirming) {
    return (
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#18181b] border border-zinc-700/60 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-20 select-none",
          className
        )}
      >
        <div className="pl-1 pr-0.5 text-zinc-400">
          <Trash2 className="w-3.5 h-3.5" />
        </div>

        {/* RareUI Confirm (Orange Checkmark inside dark circle) */}
        <button
          type="button"
          disabled={isDeleting}
          onClick={handleConfirmDelete}
          title="Confirm Delete"
          className="w-6 h-6 rounded-full bg-[#27272a] hover:bg-[#323238] active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-xs"
        >
          {isDeleting ? (
            <IosLoader size="sm" color="#f97316" />
          ) : (
            <Check className="w-3.5 h-3.5 text-[#f97316] stroke-[2.5]" />
          )}
        </button>

        {/* RareUI Cancel (Grey Cross inside dark circle) */}
        <button
          type="button"
          disabled={isDeleting}
          onClick={handleCancel}
          title="Cancel"
          className="w-6 h-6 rounded-full bg-[#27272a] hover:bg-[#323238] active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-xs"
        >
          <X className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled || isDeleting}
      onClick={handleOpenConfirm}
      title={label}
      className={cn(
        "p-1.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors select-none cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
