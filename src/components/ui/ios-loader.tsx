"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface IosLoaderProps {
  size?: "sm" | "md" | "lg"
  className?: string
  color?: string
}

export function IosLoader({ size = "md", className, color }: IosLoaderProps) {
  const pixelSize = size === "sm" ? 18 : size === "lg" ? 32 : 24

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <svg
        viewBox="0 0 24 24"
        width={pixelSize}
        height={pixelSize}
        className="animate-[spin_1s_linear_infinite]"
      >
        {[
          { angle: 0, opacity: 1 },
          { angle: 30, opacity: 0.9 },
          { angle: 60, opacity: 0.8 },
          { angle: 90, opacity: 0.7 },
          { angle: 120, opacity: 0.6 },
          { angle: 150, opacity: 0.5 },
          { angle: 180, opacity: 0.4 },
          { angle: 210, opacity: 0.3 },
          { angle: 240, opacity: 0.25 },
          { angle: 270, opacity: 0.2 },
          { angle: 300, opacity: 0.15 },
          { angle: 330, opacity: 0.1 },
        ].map((blade, idx) => (
          <rect
            key={idx}
            x="11"
            y="2"
            width="2"
            height="5.5"
            rx="1"
            fill={color || "currentColor"}
            opacity={blade.opacity}
            transform={`rotate(${blade.angle} 12 12)`}
          />
        ))}
      </svg>
    </div>
  )
}

