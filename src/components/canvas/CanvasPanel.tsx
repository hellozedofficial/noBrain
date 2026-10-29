"use client"

import React, { useState } from "react"
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sparkles,
  Shapes,
  Palette,
  Check,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getLastDispatchedDesign, dispatchCanvasDesign } from "@/lib/canvas/bridge"
import { PRESET_LOGO_TEMPLATES, LogoTemplate } from "@/lib/canvas/logoEngine"

interface CanvasPanelProps {
  isOpen: boolean
  onClose: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function CanvasPanel({
  isOpen,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
}: CanvasPanelProps) {
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  if (!isOpen) return null

  const handleIframeLoad = () => {
    const last = getLastDispatchedDesign()
    if (last) {
      setTimeout(() => {
        dispatchCanvasDesign(last, true)
      }, 350)
    }
  }

  const handleApplyLogoTemplate = (template: LogoTemplate) => {
    dispatchCanvasDesign(template.design, true)
    setAppliedId(template.id)
    setTimeout(() => {
      setAppliedId(null)
      setIsTemplatesOpen(false)
    }, 800)
  }

  const filteredTemplates =
    activeCategory === "all"
      ? PRESET_LOGO_TEMPLATES
      : PRESET_LOGO_TEMPLATES.filter((t) => t.category === activeCategory)

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-background border-l border-border-subtle transition-all duration-300 ease-in-out shrink-0 relative z-30 select-none shadow-2xl",
        isFullscreen ? "w-full fixed inset-0 z-50" : "w-[75vw] max-w-[75vw]"
      )}
    >
      {/* Top Header Bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border-subtle bg-surface/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-foreground tracking-tight truncate">
              noBrain Canvas
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 hidden sm:inline-flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              <span>Studio</span>
            </span>
          </div>

          {/* Logo Templates Picker Button */}
          <button
            type="button"
            onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            className={cn(
              "ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
              isTemplatesOpen
                ? "bg-amber-500 text-black shadow-sm"
                : "bg-input-bg border border-input-border text-foreground hover:bg-hover"
            )}
          >
            <Shapes className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Logo Templates</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Open full page in new tab */}
          <a
            href="/canvas"
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new window"
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {/* Fullscreen / 75% toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (75%)" : "Fullscreen (100%)"}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Close Panel */}
          <button
            type="button"
            onClick={onClose}
            title="Close Canvas"
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer ml-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace with Embedded Iframe & Overlay Templates Drawer */}
      <div className="flex-1 w-full h-[calc(100%-3rem)] bg-background relative overflow-hidden flex">
        {/* Logo Templates Drawer Overlay */}
        {isTemplatesOpen && (
          <div className="absolute inset-y-0 left-0 w-80 sm:w-96 bg-card-bg/95 backdrop-blur-md border-r border-border-subtle shadow-2xl z-40 flex flex-col animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Shapes className="h-4 w-4 text-amber-500" />
                  <span>Canva-Grade Logo Archetypes</span>
                </h4>
                <p className="text-[11px] text-muted">
                  Click any vector archetype to load into the canvas editor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(false)}
                className="p-1 text-muted hover:text-foreground rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="px-4 py-2 border-b border-border-subtle/50 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
              {["all", "tech", "minimal", "luxury", "monogram", "corporate"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium capitalize whitespace-nowrap cursor-pointer transition-colors",
                    activeCategory === cat
                      ? "bg-foreground text-background font-semibold"
                      : "bg-input-bg text-muted hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Cards List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {filteredTemplates.map((template) => {
                const isSelected = appliedId === template.id
                return (
                  <div
                    key={template.id}
                    onClick={() => handleApplyLogoTemplate(template)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 group relative overflow-hidden",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border-subtle bg-input-bg/70 hover:border-amber-500/50 hover:bg-input-bg"
                    )}
                  >
                    {/* SVG Vector Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-black/40 border border-white/10 shrink-0 flex items-center justify-center p-1.5">
                      <div
                        className="w-full h-full flex items-center justify-center transition-transform group-hover:scale-110"
                        dangerouslySetInnerHTML={{ __html: template.thumbnailSvg }}
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {template.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-user-bubble text-muted shrink-0">
                          {template.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted line-clamp-1 pt-0.5">
                        {template.description}
                      </p>

                      {/* Color dots */}
                      <div className="flex items-center gap-1 pt-1.5">
                        {template.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 text-muted group-hover:text-amber-500 transition-colors">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Embedded noBrain Canvas Iframe */}
        <iframe
          ref={iframeRef}
          onLoad={handleIframeLoad}
          src="/canvas?view=editor"
          title="noBrain Canvas"
          className="w-full h-full border-0 block"
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  )
}
