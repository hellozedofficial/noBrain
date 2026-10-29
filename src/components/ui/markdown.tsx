import { cn } from "@/lib/utils"
import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { CodeBlock, CodeBlockCode } from "./code-block"
import { CanvasDesignCard } from "@/components/canvas/CanvasDesignCard"
import { extractCanvasDesignFromMarkdown, parseJsonSafely } from "@/lib/canvas/bridge"

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : "plaintext"
}

const INITIAL_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line

    if (isInline) {
      return (
        <span
          className={cn(
            "bg-muted/15 text-foreground rounded px-1.5 py-0.5 font-mono text-[13px]",
            className
          )}
          {...props}
        >
          {children}
        </span>
      )
    }

    const language = extractLanguage(className)
    const rawCode =
      typeof children === "string"
        ? children
        : Array.isArray(children)
        ? children.join("")
        : String(children || "")

    // Intercept ANY canvas or logo design (even if bare ``` without language tag or with unescaped newlines)
    const isDesignLikely =
      language === "canvas" ||
      language === "json" ||
      rawCode.includes('"format"') ||
      rawCode.includes('"isLogo"') ||
      rawCode.includes('"layers"') ||
      rawCode.includes('"title"')

    if (isDesignLikely) {
      try {
        const parsed =
          parseJsonSafely(rawCode) ||
          extractCanvasDesignFromMarkdown("```canvas\n" + rawCode + "\n```")

        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed.layers || parsed.format || parsed.isLogo || (parsed.background && parsed.title))
        ) {
          return <CanvasDesignCard design={parsed} />
        }
      } catch {}
    }

    return (
      <CodeBlock className={className}>
        <CodeBlockCode code={children as string} language={language} />
      </CodeBlock>
    )
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>
  },
  table: function TableComponent({ className, children, ...props }) {
    return (
      <div className="my-4 w-full overflow-x-auto rounded-xl border border-border-subtle shadow-sm">
        <table
          className={cn("w-full border-collapse text-left text-sm", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    )
  },
  thead: function TheadComponent({ className, children, ...props }) {
    return (
      <thead
        className={cn(
          "border-b border-border-subtle bg-muted/10 font-semibold text-foreground select-none",
          className
        )}
        {...props}
      >
        {children}
      </thead>
    )
  },
  tbody: function TbodyComponent({ className, children, ...props }) {
    return (
      <tbody className={cn("divide-y divide-border-subtle/40", className)} {...props}>
        {children}
      </tbody>
    )
  },
  tr: function TrComponent({ className, children, ...props }) {
    return (
      <tr className={cn("hover:bg-muted/5 transition-colors", className)} {...props}>
        {children}
      </tr>
    )
  },
  th: function ThComponent({ className, children, ...props }) {
    return (
      <th
        className={cn("px-4 py-2.5 font-semibold text-foreground tracking-tight", className)}
        {...props}
      >
        {children}
      </th>
    )
  },
  td: function TdComponent({ className, children, ...props }) {
    return (
      <td
        className={cn("px-4 py-2.5 align-top leading-relaxed text-foreground/90", className)}
        {...props}
      >
        {children}
      </td>
    )
  },
  a: function LinkComponent({ className, children, href, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("text-blue-500 hover:text-blue-600 underline underline-offset-2", className)}
        {...props}
      >
        {children}
      </a>
    )
  },
  ul: function UlComponent({ className, children, ...props }) {
    return (
      <ul className={cn("my-2 ml-5 list-disc space-y-1", className)} {...props}>
        {children}
      </ul>
    )
  },
  ol: function OlComponent({ className, children, ...props }) {
    return (
      <ol className={cn("my-2 ml-5 list-decimal space-y-1", className)} {...props}>
        {children}
      </ol>
    )
  },
  li: function LiComponent({ className, children, ...props }) {
    return (
      <li className={cn("leading-relaxed", className)} {...props}>
        {children}
      </li>
    )
  },
  hr: function HrComponent({ className, ...props }) {
    return <hr className={cn("my-4 border-border-subtle", className)} {...props} />
  },
  blockquote: function BlockquoteComponent({ className, children, ...props }) {
    return (
      <blockquote
        className={cn(
          "my-3 border-l-4 border-muted/40 pl-4 italic text-muted",
          className
        )}
        {...props}
      >
        {children}
      </blockquote>
    )
  },
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string
    components?: Partial<Components>
  }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content
  }
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${index}`}
          content={block}
          components={components}
        />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }
