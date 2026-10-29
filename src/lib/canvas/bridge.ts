/**
 * noBrain Canvas Realtime Bridge
 * Facilitates parent-to-iframe communication for realtime AI design generation.
 */

import { VECTOR_MARKS } from "@/lib/canvas/logoEngine"

let lastDispatchedDesign: any = null
let lastDispatchedSignature = ""
let pendingDeliverTimer: any = null

export function setLastDispatchedDesign(design: any) {
  lastDispatchedDesign = design
}

export function getLastDispatchedDesign(): any {
  return lastDispatchedDesign
}

export function sanitizeJsonString(str: string): string {
  if (!str) return ""
  // Replace literal unescaped newlines/tabs inside quotes so JSON.parse doesn't throw Bad control character
  return str.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    return match.replace(/\r?\n/g, "\\n").replace(/\t/g, " ")
  })
}

export function parseJsonSafely(raw: string): any | null {
  if (!raw) return null
  const sanitized = sanitizeJsonString(raw.trim())
  try {
    return JSON.parse(sanitized)
  } catch {}

  // Try extracting the outermost { ... }
  const firstBrace = raw.indexOf("{")
  const lastBrace = raw.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1)
    const sanitizedCandidate = sanitizeJsonString(candidate)
    try {
      return JSON.parse(sanitizedCandidate)
    } catch {
      try {
        // Strip trailing commas before closing braces/brackets
        const cleaned = sanitizedCandidate.replace(/,\s*([\]}])/g, "$1")
        return JSON.parse(cleaned)
      } catch {}
    }
  }

  // Fallback regex synthesizer if model produced broken JSON for a design
  if (
    raw.includes('"format"') ||
    raw.includes('"layers"') ||
    raw.includes('"isLogo"') ||
    raw.includes('"title"')
  ) {
    try {
      const formatMatch = raw.match(/"format"\s*:\s*"([^"]+)"/)
      const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/)
      const contentMatch = raw.match(/"content"\s*:\s*"([^"]+)"/)
      const brandName = contentMatch
        ? contentMatch[1]
        : titleMatch
        ? titleMatch[1].replace(/logo/i, "").trim()
        : "BRAND"

      return {
        format: formatMatch ? formatMatch[1] : "instagram-feed",
        title: titleMatch ? titleMatch[1] : `${brandName} Logo`,
        isLogo: true,
        background: {
          type: "gradient",
          gradientType: "linear",
          angle: 145,
          stops: [
            { position: 0, color: "#0B0F19" },
            { position: 1, color: "#050811" },
          ],
        },
        layers: [
          {
            type: "svg",
            name: "Logo Mark",
            svgContent: VECTOR_MARKS.vertexPrism,
            x: 440,
            y: 250,
            width: 200,
            height: 200,
          },
          {
            type: "text",
            name: "Brand Wordmark",
            content: brandName,
            x: 90,
            y: 520,
            width: 900,
            textAlign: "center",
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: 0.12,
            textTransform: "uppercase",
            color: "#FFFFFF",
          },
        ],
      }
    } catch {}
  }

  return null
}

export function extractCanvasDesignFromMarkdown(text: string): any | null {
  if (!text) return null

  // 1. Match ```canvas ... ``` or ```json:canvas ... ```
  const canvasMatch = text.match(/```(?:canvas|json:canvas)\s*\n?([\s\S]*?)```/)
  if (canvasMatch && canvasMatch[1]) {
    const parsed = parseJsonSafely(canvasMatch[1])
    if (parsed && typeof parsed === "object") return normalizeDesign(parsed)
  }

  // 2. Match standard ```json ... ``` or ANY ``` ... ``` containing design properties
  const codeBlocks = text.matchAll(/```(?:\w+)?\s*\n?([\s\S]*?)```/g)
  for (const match of codeBlocks) {
    if (match && match[1]) {
      const content = match[1]
      if (
        content.includes('"format"') ||
        content.includes('"layers"') ||
        content.includes('"isLogo"') ||
        content.includes('"background"')
      ) {
        const parsed = parseJsonSafely(content)
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed.layers || parsed.format || (parsed.background && parsed.title) || parsed.isLogo)
        ) {
          return normalizeDesign(parsed)
        }
      }
    }
  }

  // 3. Fallback: Check if raw text contains a complete JSON design
  if (
    text.includes('"format"') &&
    (text.includes('"layers"') || text.includes('"background"') || text.includes('"isLogo"'))
  ) {
    const parsed = parseJsonSafely(text)
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.layers || parsed.format || parsed.isLogo)
    ) {
      return normalizeDesign(parsed)
    }
  }

  return null
}

/**
 * Normalizes design layers to ensure high-fidelity, Canva-grade aesthetics.
 * Automatically resolves named vector marks, replaces primitive/empty shapes with
 * resolution-independent gradient vector marks, balances typography, and generates
 * professional taglines when missing.
 */
function normalizeDesign(design: any): any {
  if (!design || !Array.isArray(design.layers)) return design
  const normalized = { ...design }
  const isLogo = Boolean(
    normalized.isLogo ||
      (normalized.format === "instagram-feed" &&
        (normalized.title?.toLowerCase().includes("logo") ||
          design.layers.some((l: any) => l.name?.toLowerCase().includes("mark") || l.name?.toLowerCase().includes("logo"))))
  )

  const titleStr = String(normalized.title || "").toLowerCase()

  // Helper to pick best vector mark based on context keywords
  const pickBestVectorMark = (hint = ""): string => {
    const combined = `${titleStr} ${hint}`.toLowerCase()
    if (combined.includes("synapse") || combined.includes("neural") || combined.includes("brain") || combined.includes("ai")) {
      return (VECTOR_MARKS as any).synapseNeural || VECTOR_MARKS.vertexPrism
    }
    if (combined.includes("quantum") || combined.includes("cube") || combined.includes("data") || combined.includes("block")) {
      return (VECTOR_MARKS as any).quantumCube || VECTOR_MARKS.vertexPrism
    }
    if (combined.includes("cyber") || combined.includes("hex") || combined.includes("matrix") || combined.includes("security")) {
      return (VECTOR_MARKS as any).cyberHexagon || VECTOR_MARKS.vertexPrism
    }
    if (combined.includes("velocity") || combined.includes("motion") || combined.includes("speed") || combined.includes("sport") || combined.includes("aura")) {
      return VECTOR_MARKS.auraVelocity
    }
    if (combined.includes("orbit") || combined.includes("sphere") || combined.includes("circle") || combined.includes("space") || combined.includes("labs")) {
      return VECTOR_MARKS.celestialOrbit
    }
    if (combined.includes("knot") || combined.includes("interior") || combined.includes("borcelle") || combined.includes("craft")) {
      return VECTOR_MARKS.interlockingKnot
    }
    if (combined.includes("luxury") || combined.includes("monogram") || combined.includes("gold") || combined.includes("shield") || combined.includes("royal")) {
      return VECTOR_MARKS.luxuryMonogramShield
    }
    if (combined.includes("ribbon") || combined.includes("origami") || combined.includes("creative")) {
      return VECTOR_MARKS.foldedRibbon
    }
    if (combined.includes("liquid") || combined.includes("fluid") || combined.includes("flow")) {
      return VECTOR_MARKS.fluidRibbon
    }
    return VECTOR_MARKS.vertexPrism
  }

  // 1. Process layers
  let hasWordmark = false
  let hasTagline = false
  let primaryWordmarkText = ""

  normalized.layers = design.layers.map((layer: any) => {
    // If explicit mark key was provided: e.g. "mark": "vertexPrism"
    if (layer.mark && (VECTOR_MARKS as any)[layer.mark]) {
      return {
        ...layer,
        type: "svg",
        svgContent: (VECTOR_MARKS as any)[layer.mark],
        keepColors: true,
        width: layer.width || 210,
        height: layer.height || 210,
        x: layer.x || 435,
        y: layer.y || 240,
      }
    }

    // Replace empty/broken SVG or primitive diamond/rectangle logo marks with Canva-grade mark
    const isMarkLayer =
      layer.name?.toLowerCase().includes("mark") ||
      layer.name?.toLowerCase().includes("logo") ||
      layer.name?.toLowerCase().includes("emblem") ||
      layer.name?.toLowerCase().includes("icon") ||
      layer.type === "icon" ||
      (layer.type === "shape" && isLogo && layer.rotation === 45)

    if (
      isMarkLayer ||
      (layer.type === "svg" &&
        (!layer.svgContent ||
          typeof layer.svgContent !== "string" ||
          !layer.svgContent.trim() ||
          !layer.svgContent.includes("<") ||
          layer.svgContent.trim().length < 40))
    ) {
      const bestMark = pickBestVectorMark(layer.name || layer.icon || layer.shape || "")
      return {
        ...layer,
        type: "svg",
        name: layer.name || "Brand Emblem Mark",
        svgContent: bestMark,
        keepColors: true,
        width: Math.max(180, Math.min(layer.width || 220, 260)),
        height: Math.max(180, Math.min(layer.height || 220, 260)),
        x: 440,
        y: 240,
      }
    }

    // Format text layers if this is a logo
    if (isLogo && layer.type === "text") {
      if (!hasWordmark) {
        hasWordmark = true
        primaryWordmarkText = layer.content || ""
        return {
          ...layer,
          name: "Brand Wordmark",
          x: 90,
          y: layer.y || 525,
          width: 900,
          textAlign: "center",
          fontSize: Math.max(54, Math.min(layer.fontSize || 64, 76)),
          fontWeight: 900,
          letterSpacing: 0.12,
          textTransform: layer.textTransform || "uppercase",
          color: layer.color || "#FFFFFF",
        }
      } else {
        hasTagline = true
        return {
          ...layer,
          name: "Tagline",
          x: 90,
          y: layer.y || 625,
          width: 900,
          textAlign: "center",
          fontSize: Math.max(13, Math.min(layer.fontSize || 15, 18)),
          fontWeight: 700,
          letterSpacing: 0.28,
          textTransform: "uppercase",
          color: layer.color || "#38BDF8",
        }
      }
    }

    return layer
  })

  // 2. If it's a logo and missing a tagline, automatically inject a stunning coordinated tagline
  if (isLogo && hasWordmark && !hasTagline) {
    let taglineCopy = "NEXT-GEN CLOUD & INTELLIGENT SYSTEMS"
    const lower = primaryWordmarkText.toLowerCase()
    if (lower.includes("synapse")) {
      taglineCopy = "AUTONOMOUS CLOUD & NEURAL INTELLIGENCE"
    } else if (lower.includes("crypto") || lower.includes("pay") || lower.includes("fin")) {
      taglineCopy = "NEXT-GEN SECURE DIGITAL FINANCE"
    } else if (lower.includes("creative") || lower.includes("studio")) {
      taglineCopy = "INDEPENDENT DESIGN & CREATIVE LAB"
    } else if (lower.includes("motion") || lower.includes("sport")) {
      taglineCopy = "HIGH VELOCITY WEAR • EST 2026"
    }

    normalized.layers.push({
      type: "text",
      name: "Tagline",
      content: taglineCopy,
      x: 90,
      y: 625,
      width: 900,
      textAlign: "center",
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: 0.28,
      textTransform: "uppercase",
      color: "#38BDF8",
    })
  }

  // 3. Ensure modern background gradient for dark logos
  if (
    isLogo &&
    (!normalized.background ||
      (normalized.background.type === "solid" &&
        (normalized.background.color === "#000000" || normalized.background.color === "#050505" || normalized.background.color === "#09090B")))
  ) {
    normalized.background = {
      type: "gradient",
      gradientType: "linear",
      angle: 145,
      stops: [
        { position: 0, color: "#0B0F19" },
        { position: 1, color: "#050811" },
      ],
    }
  }

  return normalized
}

/**
 * Sends a design payload to the noBrain Canvas iframe.
 * Automatically ensures the canvas panel is open, navigates to the editor view,
 * and delivers the design cleanly without flickering or repeated dispatch loops.
 */
export function dispatchCanvasDesign(design: any, force = false): boolean {
  if (typeof window === "undefined" || !design) return false

  const cleanDesign = normalizeDesign(design)
  const sig = typeof cleanDesign === "string" ? cleanDesign.trim() : JSON.stringify(cleanDesign)
  lastDispatchedSignature = sig
  setLastDispatchedDesign(cleanDesign)

  // Clear any previous delivery timeout
  if (pendingDeliverTimer) {
    clearTimeout(pendingDeliverTimer)
    pendingDeliverTimer = null
  }

  // Notify parent window to ensure canvas panel is open and sidebar collapsed
  window.dispatchEvent(new CustomEvent("nobrain:open-canvas-request"))

  let attempts = 0
  const maxAttempts = 15

  const tryDeliver = (): boolean => {
    attempts++
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe[title="noBrain Canvas"]'
    )

    if (!iframe || !iframe.contentWindow) {
      if (attempts < maxAttempts) {
        pendingDeliverTimer = setTimeout(tryDeliver, 100)
      }
      return false
    }

    try {
      const targetWin = iframe.contentWindow as any

      // 1. Switch tela route to editor if on files/library
      targetWin.postMessage(
        { source: "tela-canvas", type: "show", view: "editor" },
        "*"
      )

      // 2. Try direct handle
      if (targetWin.nobrain?.applyDesign) {
        targetWin.nobrain.applyDesign(cleanDesign, force)
        return true
      }

      // 3. PostMessage bridge (send once)
      targetWin.postMessage(
        {
          source: "nobrain",
          type: "nobrain:apply-design",
          design: cleanDesign,
          force,
        },
        "*"
      )
      return true
    } catch (err) {
      console.warn("Canvas dispatch attempt warning:", err)
      if (attempts < maxAttempts) {
        pendingDeliverTimer = setTimeout(tryDeliver, 150)
      }
      return false
    }
  }

  return tryDeliver()
}
