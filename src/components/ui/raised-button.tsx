"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import {
  getContrastColor,
  getLuminance,
  parseColor,
} from "@/lib/utils/colorUtils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative cursor-pointer active:scale-[0.96] subpixel-antialiased gap-2 select-none border shadow-md before:absolute before:inset-0 before:border-t before:border-white/35 before:bg-gradient-to-b before:from-white/20 before:to-transparent overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-white border-zinc-950/60 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200/60 hover:opacity-95 shadow-zinc-950/20 dark:shadow-black/40",
        primary:
          "bg-blue-600 text-white border-blue-700/60 hover:bg-blue-600/90 shadow-blue-500/25",
        secondary:
          "bg-zinc-100 text-zinc-900 border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700/70 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/80",
        ghost:
          "bg-transparent text-foreground border-transparent shadow-none hover:bg-zinc-100 dark:hover:bg-zinc-800 before:hidden",
        danger:
          "bg-rose-600 text-white border-rose-700/60 hover:bg-rose-700 shadow-rose-600/25",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-2xl before:rounded-2xl",
        sm: "h-8 rounded-xl px-3 text-xs before:rounded-xl",
        lg: "h-11 rounded-2xl px-6 text-base before:rounded-2xl",
        icon: "h-9 w-9 rounded-xl before:rounded-xl p-0",
        iconRound: "h-9 w-9 rounded-full before:rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface RaisedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  color?: string
}

export const RaisedButton = React.forwardRef<HTMLButtonElement, RaisedButtonProps>(
  ({ className, variant, size, color, style = {}, ...props }, ref) => {
    const dynamicStyles = React.useMemo(() => {
      if (!color) return {}

      try {
        const rgb = parseColor(color)
        if (!rgb) return {}

        const luminance = getLuminance(rgb)
        const textColor = getContrastColor(luminance)
        const borderOpacity = 0.5
        const shadowOpacity = 0.25

        return {
          backgroundColor: color,
          color: textColor,
          borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${borderOpacity})`,
          boxShadow: `0 4px 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${shadowOpacity})`,
        }
      } catch (e) {
        console.error("Error processing button color:", e)
        return {}
      }
    }, [color])

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        style={{
          ...style,
          ...dynamicStyles,
        }}
        {...props}
      />
    )
  }
)

RaisedButton.displayName = "RaisedButton"

