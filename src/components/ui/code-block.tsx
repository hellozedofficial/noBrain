"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"
import { codeToHtml } from "shiki"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose my-3 flex w-full flex-col overflow-clip border border-border-subtle bg-card-bg rounded-xl text-foreground shadow-xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

  useEffect(() => {
    async function highlight() {
      if (!code) {
        setHighlightedHtml("<pre><code></code></pre>")
        return
      }

      const isDark = document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches
      const chosenTheme = isDark ? "github-dark" : "github-light"

      try {
        const html = await codeToHtml(code, { lang: language, theme: chosenTheme })
        setHighlightedHtml(html)
      } catch {
        setHighlightedHtml(`<pre class="p-4 text-xs font-mono"><code>${code}</code></pre>`)
      }
    }
    highlight()
  }, [code, language])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-3.5 [&>pre]:bg-transparent! [&>pre]:m-0",
    className
  )

  return (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml || `<pre class="px-4 py-3.5 text-xs font-mono"><code>${code}</code></pre>` }}
      {...props}
    />
  )
}

export { CodeBlock, CodeBlockCode }
