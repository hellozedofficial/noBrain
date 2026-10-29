"use client"

import React, { useState } from "react"
import { Sparkles, Check, Palette, ChevronDown, ChevronUp, Copy, Shapes, Layers } from "lucide-react"
import { dispatchCanvasDesign } from "@/lib/canvas/bridge"
import { VECTOR_MARKS } from "@/lib/canvas/logoEngine"

interface CanvasDesignCardProps {
  design: any
  onOpenCanvas?: () => void
}

export function CanvasDesignCard({ design, onOpenCanvas }: CanvasDesignCardProps) {
  const [isApplied, setIsApplied] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  if (!design) return null

  const formatLabels: Record<string, string> = {
    "instagram-feed": "1:1 Square (1080×1080)",
    "instagram-story": "Instagram Story (1080×1920)",
    "facebook-story": "Facebook Story (1080×1920)",
    "facebook-feed": "Facebook Ad (1200×628)",
    "linkedin-feed": "LinkedIn Banner (1200×627)",
    "generic-banner": "Display Banner (1200×400)",
  }

  const formatKey = String(design.format || "instagram-feed").toLowerCase()
  const layers: any[] = Array.isArray(design.layers) ? design.layers : []
  const textLayers = layers.filter((l) => l.type === "text")
  const shapeLayers = layers.filter((l) => l.type === "shape")
  const imageLayers = layers.filter((l) => l.type === "image")
  const svgLayers = layers.filter((l) => l.type === "svg" || l.type === "icon")

  const isLogo =
    Boolean(design.isLogo) ||
    (formatKey === "instagram-feed" &&
      (design.title?.toLowerCase().includes("logo") ||
        layers.some(
          (l) =>
            l.name?.toLowerCase().includes("mark") ||
            l.name?.toLowerCase().includes("wordmark") ||
            l.name?.toLowerCase().includes("emblem")
        )))

  const formatLabel = isLogo
    ? "Vector Logo Design (1080×1080)"
    : formatLabels[formatKey] || design.format || "Social Graphic"

  const brandMarkLayer = svgLayers[0]
  const brandTitleLayer = textLayers[0]
  const brandSubheadLayer = textLayers[1]

  const displayTitle =
    design.title || brandTitleLayer?.content?.replace(/\\n/g, " ") || "Canvas Design"

  // Background styling for mini preview
  let bgStyle: React.CSSProperties = { backgroundColor: "#09090b" }
  if (design.background) {
    if (design.background.type === "gradient" && Array.isArray(design.background.stops)) {
      const angle = design.background.angle || 135
      const stopsStr = design.background.stops
        .map((s: any) => `${s.color || s.colorToken || "#000"} ${Math.round((s.position || 0) * 100)}%`)
        .join(", ")
      bgStyle = { background: `linear-gradient(${angle}deg, ${stopsStr})` }
    } else if (design.background.color || design.background.colorToken) {
      bgStyle = { backgroundColor: design.background.color || design.background.colorToken }
    }
  }

  const handleApply = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    // 1. Dispatch design to canvas iframe & switch view to editor
    dispatchCanvasDesign(design, true)

    // 2. Open canvas panel if callback passed
    if (onOpenCanvas) {
      onOpenCanvas()
    }

    setIsApplied(true)
    setTimeout(() => setIsApplied(false), 2500)
  }

  const handleCopyJson = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(JSON.stringify(design, null, 2))
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1500)
  }

  const hasSvg =
    Boolean(brandMarkLayer?.svgContent) &&
    typeof brandMarkLayer.svgContent === "string" &&
    brandMarkLayer.svgContent.trim().length > 5 &&
    brandMarkLayer.svgContent.includes("<")

  return (
    <div className="my-3 w-full max-w-sm rounded-2xl bg-card-bg border border-border-subtle p-4 text-foreground shadow-xl space-y-3.5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle/50 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-input-bg border border-input-border text-foreground shrink-0">
            {isLogo ? (
              <Shapes className="h-4 w-4 text-amber-500" />
            ) : (
              <Palette className="h-4 w-4 text-foreground/80" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold tracking-tight text-foreground truncate">
              {displayTitle}
            </h3>
            <p className="text-[11px] text-muted truncate">{formatLabel}</p>
          </div>
        </div>

        {isLogo && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            Logo Studio
          </span>
        )}
      </div>

      {/* Visual Live Mini Mockup Preview */}
      <div
        style={bgStyle}
        className="w-full aspect-square max-h-[190px] rounded-xl border border-white/10 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner group select-none"
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

        {/* Center Vector Emblem */}
        <div
          className="w-16 h-16 shrink-0 relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 drop-shadow-md [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain"
          dangerouslySetInnerHTML={{
            __html: hasSvg ? brandMarkLayer.svgContent : VECTOR_MARKS.vertexPrism,
          }}
        />

        {/* Brand Name Text */}
        {brandTitleLayer?.content && (
          <div
            style={{ color: brandTitleLayer.color || "#FFFFFF" }}
            className="text-base font-black tracking-tight mt-2.5 truncate max-w-[85%] relative z-10 drop-shadow-sm uppercase"
          >
            {brandTitleLayer.content.replace(/\\n/g, " ")}
          </div>
        )}

        {/* Tagline Subhead */}
        {brandSubheadLayer?.content && (
          <div
            style={{ color: brandSubheadLayer.color || "#94A3B8" }}
            className="text-[9px] font-bold tracking-[0.2em] mt-0.5 truncate max-w-[90%] relative z-10 uppercase opacity-90"
          >
            {brandSubheadLayer.content.replace(/\\n/g, " ")}
          </div>
        )}
      </div>

      {/* Layer Specs & Breakdown */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-muted">
        {svgLayers.length > 0 && (
          <span className="rounded-md bg-input-bg border border-input-border px-2 py-0.5 flex items-center gap-1 text-foreground/80">
            <Shapes className="h-3 w-3 text-amber-500" />
            <span>Vector Mark</span>
          </span>
        )}
        {textLayers.length > 0 && (
          <span className="rounded-md bg-input-bg border border-input-border px-2 py-0.5">
            {textLayers.length} Typography {textLayers.length === 1 ? "layer" : "layers"}
          </span>
        )}
        {shapeLayers.length > 0 && (
          <span className="rounded-md bg-input-bg border border-input-border px-2 py-0.5">
            {shapeLayers.length} Shape
          </span>
        )}
        <span className="rounded-md bg-input-bg border border-input-border px-2 py-0.5">
          1080×1080 HD
        </span>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={handleApply}
        className="w-full rounded-xl bg-foreground text-background font-semibold py-2.5 text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
      >
        {isApplied ? (
          <>
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Applied to Canvas</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open & Customize in Canvas</span>
          </>
        )}
      </button>

      {/* Schema toggle */}
      <div className="pt-0 text-center">
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <span>{showJson ? "Hide vector JSON" : "Inspect vector schema"}</span>
          {showJson ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showJson && (
          <div className="mt-2 text-left">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] text-muted uppercase tracking-wider">Design Payload</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                <span>{isCopied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="max-h-36 overflow-y-auto rounded-xl bg-input-bg border border-input-border p-2.5 font-mono text-[10px] text-muted leading-relaxed">
              {JSON.stringify(design, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
