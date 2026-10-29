"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container"
import { Markdown } from "@/components/ui/markdown"
import { ModelSelector } from "@/components/chat/ModelSelector"
import {
  ArrowUp,
  Square,
  Copy,
  Check,
  Plus,
  Share,
  ThumbsUp,
  ThumbsDown,
  PanelLeft,
  X,
  Loader2,
  Maximize2,
  Search,
  Palette,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface AttachedImage {
  url: string
  dataUrl?: string
  filename: string
  previewUrl: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  model?: string
  image_url?: string | null
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  feedback?: "like" | "dislike" | null
  created_at?: string
}

export function parseThinkingContent(fullText: string) {
  if (!fullText) return { hasThinking: false, isThinking: false, thinking: "", content: "" }

  // 1. Standard XML <think> tag
  const thinkStart = fullText.indexOf("<think>")
  if (thinkStart !== -1) {
    const thinkEnd = fullText.indexOf("</think>")
    if (thinkEnd === -1) {
      // Currently still streaming inside <think>
      const thinking = fullText.slice(thinkStart + 7).trimStart()
      return { hasThinking: true, isThinking: true, thinking, content: "" }
    } else {
      // Thinking completed
      const thinking = fullText.slice(thinkStart + 7, thinkEnd).trim()
      const content = fullText.slice(thinkEnd + 8).trimStart()
      return { hasThinking: true, isThinking: false, thinking, content }
    }
  }

  // 2. Markdown "Thinking Process:" or "**Thinking Process:**"
  const tpMatch = fullText.match(/^(?:#+\s*)?(?:\*\*)?Thinking Process(?:\*\*)?:?\s*\n/i)
  if (tpMatch && tpMatch.index !== undefined) {
    const tpHeader = tpMatch[0]
    const afterHeader = fullText.slice(tpMatch.index + tpHeader.length)
    const answerMatch = afterHeader.match(/\n(?:---\n+|\*\*(?:Final Answer|Answer|Response|উত্তর):\*\*|Final Answer:|Answer:|Response:|উত্তর:)\s*/i)
    if (answerMatch && answerMatch.index !== undefined) {
      const thinking = afterHeader.slice(0, answerMatch.index).trim()
      const content = afterHeader.slice(answerMatch.index + answerMatch[0].length).trimStart()
      return { hasThinking: true, isThinking: false, thinking, content }
    } else {
      return { hasThinking: true, isThinking: true, thinking: afterHeader, content: "" }
    }
  }

  return { hasThinking: false, isThinking: false, thinking: "", content: fullText }
}

export function ThinkingAccordion({
  thinking,
  isThinking = false,
  defaultOpen = false,
}: {
  thinking: string
  isThinking?: boolean
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(isThinking || defaultOpen)

  useEffect(() => {
    if (isThinking) {
      setIsOpen(true)
    }
  }, [isThinking])

  return (
    <div className="mb-3 rounded-2xl border border-border-subtle/60 bg-muted/20 dark:bg-[#141416] overflow-hidden transition-all text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 font-medium">
          {isThinking ? (
            <span className="flex items-center gap-2 text-purple-400">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking...</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse ml-0.5" />
            </span>
          ) : (
            <span className="flex items-center gap-2 text-foreground/85">
              <span>Thought process</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted/40 text-muted-foreground font-mono">
                {isOpen ? "Hide" : "Show"}
              </span>
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-border-subtle/40 bg-black/10 dark:bg-black/30 text-muted-foreground font-mono text-[12.5px] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
          {thinking || (isThinking ? "Reasoning about your request..." : "")}
        </div>
      )}
    </div>
  )
}

interface ChatViewProps {
  messages: ChatMessage[]
  streamingText: string
  isStreaming: boolean
  input: string
  setInput: (value: string) => void
  onSend: (message: string, attachedImage?: AttachedImage | null, isGoogleSearch?: boolean) => void
  onStop: () => void
  currentTitle: string
  selectedModel: string
  onSelectModel: (model: string) => void
  onToggleSidebar: () => void
  isSidebarOpen: boolean
  isCanvasOpen?: boolean
  onToggleCanvas?: () => void
}

export function ChatView({
  messages,
  streamingText,
  isStreaming,
  input,
  setInput,
  onSend,
  onStop,
  currentTitle,
  selectedModel,
  onSelectModel,
  onToggleSidebar,
  isSidebarOpen,
  isCanvasOpen = false,
  onToggleCanvas,
}: ChatViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "like" | "dislike" | null>>({})
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isGoogleSearch, setIsGoogleSearch] = useState(false)
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize and sync feedbackMap from persisted messages
  useEffect(() => {
    if (!messages || messages.length === 0) return
    setFeedbackMap((prev) => {
      const updated = { ...prev }
      for (const m of messages) {
        if (m.feedback !== undefined) {
          updated[m.id] = m.feedback
        }
      }
      return updated
    })
  }, [messages])

  const handleToggleFeedback = async (msgId: string, type: "like" | "dislike") => {
    const current = feedbackMap[msgId]
    const nextFeedback: "like" | "dislike" | null = current === type ? null : type

    // Optimistically update UI
    setFeedbackMap((prev) => ({
      ...prev,
      [msgId]: nextFeedback,
    }))

    // Persist to database
    try {
      await fetch("/api/messages/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: msgId,
          feedback: nextFeedback,
        }),
      })
    } catch (err) {
      console.error("Failed to persist feedback:", err)
    }
  }

  // Auto-resize textarea: perfectly centered single line, grows up to 180px
  useEffect(() => {
    if (textareaRef.current) {
      if (!input) {
        textareaRef.current.style.height = "24px"
        textareaRef.current.style.overflowY = "hidden"
      } else {
        textareaRef.current.style.height = "auto"
        const nextHeight = Math.min(textareaRef.current.scrollHeight, 180)
        textareaRef.current.style.height = `${nextHeight}px`
        textareaRef.current.style.overflowY =
          textareaRef.current.scrollHeight > 180 ? "auto" : "hidden"
      }
    }
  }, [input])

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, WebP, etc.)")
      return
    }

    setIsUploadingImage(true)
    const localPreview = URL.createObjectURL(file)
    setAttachedImage({
      url: "",
      filename: file.name,
      previewUrl: localPreview,
    })

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Failed to upload image")
      }

      const data = await res.json()
      if (data.success) {
        setAttachedImage({
          url: data.url,
          dataUrl: data.dataUrl,
          filename: data.filename,
          previewUrl: data.url,
        })
      }
    } catch (err) {
      console.error("Image upload failed:", err)
      alert("Image upload failed. Please try again.")
      setAttachedImage(null)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    if (e.target) {
      e.target.value = ""
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          handleFileUpload(file)
          break
        }
      }
    }
  }

  const handleSubmit = () => {
    if ((!input.trim() && !attachedImage) || isStreaming || isUploadingImage) return
    const msg = input
    const img = attachedImage
    setInput("")
    setAttachedImage(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"
      textareaRef.current.style.overflowY = "hidden"
    }
    onSend(msg, img, isGoogleSearch)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isMultiLine = input.includes("\n") || input.length > 70
  const hasMessages = messages.length > 0 || isStreaming

  // Reusable Input Capsule with Image Upload & Preview
  const renderInputPill = () => (
    <div className="w-full">
      {/* Attached Image Preview Chip */}
      {attachedImage && (
        <div className="mb-2.5 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-card-bg border border-border-subtle shadow-md max-w-full animate-in fade-in zoom-in-95 duration-150">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-muted/10 shrink-0 border border-border-subtle">
            <img
              src={attachedImage.previewUrl}
              alt="attachment preview"
              className="w-full h-full object-cover"
            />
            {isUploadingImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-[260px]">
              {attachedImage.filename}
            </span>
            <span className="text-[11px] text-muted">
              {isUploadingImage ? "Uploading image..." : "Ready for noBrain 1.4 Vision"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            title="Remove image"
            className="p-1 rounded-full text-muted hover:text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "rounded-[28px] bg-input-bg border border-input-border focus-within:border-muted/50 px-3.5 py-2 flex gap-2.5 transition-colors shadow-sm",
          isMultiLine ? "items-end" : "items-center"
        )}
      >
        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Plus / Attach Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload image for noBrain 1.4"
          disabled={isUploadingImage}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-sidebar-hover transition-colors shrink-0 cursor-pointer"
        >
          {isUploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </button>

        {/* Auto-growing Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            attachedImage
              ? "Ask about this image..."
              : isGoogleSearch
                ? "Search Google or ask live info..."
                : "Ask anything"
          }
          rows={1}
          style={{ minHeight: "24px" }}
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-[15px] text-foreground placeholder:text-muted resize-none py-0.5 px-1 leading-6 font-sans overflow-hidden"
        />

        {/* Action Buttons: Google Search & Send/Stop */}
        <div className="shrink-0 flex items-center gap-1">
          {/* Google Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsGoogleSearch(!isGoogleSearch)}
            title={isGoogleSearch ? "Google Search is ON (Real-time live search)" : "Search Google"}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer select-none",
              isGoogleSearch
                ? "bg-blue-600/15 text-blue-500 border border-blue-500/30 shadow-xs"
                : "text-muted hover:text-foreground hover:bg-sidebar-hover"
            )}
          >
            <Search className="h-4 w-4" />
          </button>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generation"
              className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled={(!input.trim() && !attachedImage) || isUploadingImage}
              onClick={handleSubmit}
              title="Send message"
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                input.trim() || attachedImage
                  ? "bg-foreground text-background hover:opacity-90 cursor-pointer"
                  : "bg-muted/20 text-muted/40 cursor-not-allowed"
              )}
            >
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Platform Disclaimer */}
      <p className="text-[12px] text-muted text-center pt-2 select-none">
        noBrain can make mistakes. Check important info.
      </p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground min-w-0 relative overflow-hidden">
      {/* Top Header */}
      <header className="h-14 px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer shrink-0"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <ModelSelector
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* noBrain Canvas Studio Toggle */}
          {onToggleCanvas && (
            <button
              type="button"
              onClick={onToggleCanvas}
              title={isCanvasOpen ? "Hide Canvas" : "Open noBrain Canvas"}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                isCanvasOpen
                  ? "bg-purple-600/15 text-purple-400 border border-purple-500/20"
                  : "hover:bg-sidebar-hover text-muted hover:text-foreground border border-transparent"
              )}
            >
              <Palette className="h-3.5 w-3.5 text-purple-400" />
              <span>Canvas</span>
            </button>
          )}
        </div>
      </header>

      {/* Empty State: Center Agenda & Input Pill directly underneath */}
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-[760px] mx-auto w-full select-none -mt-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-7 text-center">
            What’s on the agenda today?
          </h2>
          {renderInputPill()}
        </div>
      ) : (
        <>
          {/* Active Conversation Messages Area */}
          <ChatContainerRoot className="flex-1 min-h-0 px-4 md:px-6 overflow-y-auto">
            <ChatContainerContent className="max-w-[760px] mx-auto w-full py-4 space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user"
                const userFeedback = feedbackMap[msg.id]
                return (
                  <div
                    key={msg.id || index}
                    className={cn(
                      "w-full flex flex-col",
                      isUser ? "items-end" : "items-start"
                    )}
                  >
                    {isUser ? (
                      <div className="flex flex-col items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                        {/* Uploaded Image Thumbnail */}
                        {msg.image_url && (
                          <div
                            onClick={() => setPreviewModalUrl(msg.image_url!)}
                            className="group relative rounded-2xl overflow-hidden border border-border-subtle cursor-pointer hover:opacity-95 transition-all shadow-sm max-h-72 max-w-sm bg-muted/10"
                            title="Click to view full image"
                          >
                            <img
                              src={msg.image_url}
                              alt="Uploaded attachment"
                              className="w-full h-auto object-cover max-h-72 rounded-2xl"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="p-2 rounded-full bg-black/60 text-white shadow">
                                <Maximize2 className="h-4 w-4" />
                              </span>
                            </div>
                          </div>
                        )}

                        {/* User Text Bubble */}
                        {msg.content && msg.content !== "What is in this image?" && (
                          <div className="rounded-[24px] bg-user-bubble text-user-text px-5 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap shadow-none">
                            {msg.content}
                          </div>
                        )}
                        {!msg.image_url && msg.content === "What is in this image?" && (
                          <div className="rounded-[24px] bg-user-bubble text-user-text px-5 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap shadow-none">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full group space-y-2 text-[15px] leading-[1.7] text-foreground">
                        {(() => {
                          const parsed = parseThinkingContent(msg.content)
                          return (
                            <>
                              {parsed.hasThinking && (
                                <ThinkingAccordion
                                  thinking={parsed.thinking}
                                  isThinking={false}
                                  defaultOpen={false}
                                />
                              )}
                              {parsed.content ? (
                                <div className="prose dark:prose-invert max-w-none break-words text-foreground font-normal">
                                  <Markdown>{parsed.content}</Markdown>
                                </div>
                              ) : null}
                            </>
                          )
                        })()}

                        <div className="flex items-center justify-between pt-1 text-muted">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              title="Copy response"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="p-1.5 rounded-md hover:bg-sidebar-hover hover:text-foreground transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              title="Good response"
                              onClick={() => handleToggleFeedback(msg.id, "like")}
                              className={cn(
                                "p-1.5 rounded-md hover:bg-sidebar-hover transition-colors cursor-pointer",
                                userFeedback === "like"
                                  ? "text-emerald-500"
                                  : "text-muted hover:text-foreground"
                              )}
                            >
                              <ThumbsUp
                                className={cn(
                                  "h-4 w-4",
                                  userFeedback === "like" && "fill-current"
                                )}
                              />
                            </button>

                            <button
                              type="button"
                              title="Bad response"
                              onClick={() => handleToggleFeedback(msg.id, "dislike")}
                              className={cn(
                                "p-1.5 rounded-md hover:bg-sidebar-hover transition-colors cursor-pointer",
                                userFeedback === "dislike"
                                  ? "text-rose-500"
                                  : "text-muted hover:text-foreground"
                              )}
                            >
                              <ThumbsDown
                                className={cn(
                                  "h-4 w-4",
                                  userFeedback === "dislike" && "fill-current"
                                )}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {isStreaming && (
                <div className="w-full space-y-2 text-[15px] leading-[1.7] text-foreground">
                  {streamingText ? (
                    (() => {
                      const parsedStream = parseThinkingContent(streamingText)
                      return (
                        <>
                          {parsedStream.hasThinking && (
                            <ThinkingAccordion
                              thinking={parsedStream.thinking}
                              isThinking={parsedStream.isThinking}
                              defaultOpen={true}
                            />
                          )}
                          {parsedStream.content ? (
                            <div className="prose dark:prose-invert max-w-none break-words text-foreground font-normal">
                              <Markdown>{parsedStream.content}</Markdown>
                              <span className="inline-block w-2 h-4 ml-1 bg-foreground animate-pulse align-middle" />
                            </div>
                          ) : parsedStream.isThinking ? null : (
                            <span className="inline-block w-2 h-4 ml-1 bg-foreground animate-pulse align-middle" />
                          )}
                        </>
                      )
                    })()
                  ) : (
                    <div className="flex items-center gap-2 py-2 text-muted">
                      <span className="inline-block h-2 w-2 rounded-full bg-muted animate-bounce" />
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-muted animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-muted animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  )}
                </div>
              )}

              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainerRoot>

          {/* Docked Bottom Input Bar when conversation is active */}
          <div className="p-3 sm:p-4 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0">
            <div className="max-w-[760px] mx-auto w-full">
              {renderInputPill()}
            </div>
          </div>
        </>
      )}

      {/* Lightbox Modal for Full Image Zoom */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalUrl}
              alt="Preview full view"
              className="w-full h-full object-contain max-h-[85vh] rounded-2xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
