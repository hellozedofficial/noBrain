"use client"

import React, { useState, useRef, useEffect } from "react"
import { Users, AtSign, FolderOpen, Pencil, Eraser, Crown, MessageSquareX, MoreHorizontal } from "lucide-react"
import { CopilotRoom, CopilotBot, CopilotMessage } from "@/lib/copilot/types"
import { BotAvatar3D } from "./BotAvatar3D"
import { Markdown } from "@/components/ui/markdown"
import { GaiaComposer } from "./GaiaComposer"
import { RaisedButton } from "@/components/ui/raised-button"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { rareToast } from "@/components/ui/rare-toast"
import { AiStatus } from "@/components/ui/ai-status"

interface RoomChatViewProps {
  room: CopilotRoom
  assignedBots: CopilotBot[]
  messages: CopilotMessage[]
  filesCount?: number
  isPanelOpen?: boolean
  panelWidth?: number
  onTogglePanel?: () => void
  onReloadRoom: () => void
  onEditRoom?: () => void
  onClearChat?: () => void
}

export function RoomChatView({
  room,
  assignedBots,
  messages: initialMessages,
  filesCount = 0,
  isPanelOpen = false,
  panelWidth = 420,
  onTogglePanel,
  onReloadRoom,
  onEditRoom,
  onClearChat,
}: RoomChatViewProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>(initialMessages)
  const [inputText, setInputText] = useState("")
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Collapse buttons into 3-dot dropdown if right panel is open & >= 360px
  const isCompact = isPanelOpen && panelWidth >= 360

  // Streaming state for room
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingStatusText, setStreamingStatusText] = useState("Thinking...")
  const [streamingElapsed, setStreamingElapsed] = useState(0)
  const [activeStreamMsgId, setActiveStreamMsgId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending, isStreaming])

  // Click outside to close 3-dot dropdown menu
  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen])

  const handleAttachImage = async (file: File) => {
    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setAttachedImage({ url: data.url, name: file.name })
        rareToast.success("Image attached", file.name)
      } else {
        rareToast.error("Upload failed", "Could not upload image")
      }
    } catch (err) {
      console.error("Upload error:", err)
      rareToast.error("Upload error", "Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async () => {
    if ((!inputText.trim() && !attachedImage) || isSending || isStreaming) return

    const userText = inputText.trim() || (attachedImage ? "Inspect this image" : "")
    const imgUrl = attachedImage?.url || null
    setInputText("")
    setAttachedImage(null)
    setIsSending(true)

    // 1. Optimistic User bubble
    const tempUserMsg: CopilotMessage = {
      id: `temp_${Date.now()}`,
      user_id: "user",
      room_id: room.id,
      sender_name: "You",
      role: "user",
      content: userText,
      image_url: imgUrl,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    setIsStreaming(true)
    setStreamingStatusText("Squad is assembling thoughts...")
    setStreamingElapsed(0)

    const startTime = Date.now()
    const timerInterval = setInterval(() => {
      setStreamingElapsed(Number(((Date.now() - startTime) / 1000).toFixed(1)))
    }, 100)

    try {
      const res = await fetch(`/api/copilot/rooms/${room.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, imageUrl: imgUrl }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to stream room response")
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let currentBotMsgId = ""
      let currentBotContent = ""
      let currentBotReasoning = ""

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() || ""

        for (const ev of events) {
          const trimmed = ev.trim()
          if (!trimmed.startsWith("data:")) continue
          const dataStr = trimmed.slice(5).trim()
          if (dataStr === "[DONE]") continue

          try {
            const payload = JSON.parse(dataStr)

            if (payload.type === "bot_start") {
              const b = payload.bot
              currentBotMsgId = `stream_${b.id}_${Date.now()}`
              currentBotContent = ""
              currentBotReasoning = ""
              setActiveStreamMsgId(currentBotMsgId)
              setStreamingStatusText(`${b.name} is thinking...`)

              setMessages((prev) => [
                ...prev,
                {
                  id: currentBotMsgId,
                  user_id: "assistant",
                  room_id: room.id,
                  bot_id: b.id,
                  sender_name: b.name,
                  role: "assistant",
                  content: "",
                  reasoning: "",
                  duration_seconds: null,
                  created_at: new Date().toISOString(),
                },
              ])
            } else if (payload.type === "status" && payload.statusText) {
              setStreamingStatusText(payload.statusText)
            } else if (payload.type === "reasoning" && payload.text) {
              currentBotReasoning += payload.text
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentBotMsgId ? { ...m, reasoning: currentBotReasoning } : m
                )
              )
            } else if (payload.type === "token" && payload.text) {
              currentBotContent += payload.text
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentBotMsgId ? { ...m, content: currentBotContent } : m
                )
              )
            } else if (payload.type === "tool") {
              if (payload.text && payload.text.toLowerCase().includes("saved")) {
                onReloadRoom()
              }
            } else if (payload.type === "bot_done") {
              onReloadRoom()
            } else if (payload.type === "done") {
              const dur = payload.data?.durationSeconds ?? Number(((Date.now() - startTime) / 1000).toFixed(1))
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentBotMsgId
                    ? {
                      ...m,
                      id: payload.data?.messageId || m.id,
                      content: currentBotContent || payload.data?.reply || m.content,
                      reasoning: currentBotReasoning || payload.data?.reasoning || m.reasoning,
                      duration_seconds: dur,
                    }
                    : m
                )
              )
            }
          } catch (e) {
            console.error("Room stream parse error:", e)
          }
        }
      }
    } catch (e: any) {
      console.error("Room streaming error:", e)
      rareToast.error("Collaboration Error", e.message || "Failed squad turn")
    } finally {
      clearInterval(timerInterval)
      setIsStreaming(false)
      setIsSending(false)
      setActiveStreamMsgId(null)
      onReloadRoom()
    }
  }

  const handleMentionBot = (botName: string) => {
    setInputText((prev) => `${prev}@${botName} `)
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-background text-foreground relative">
      {/* Room Header - Borderless Clean HeyGaia Style */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-background/90 backdrop-blur-md z-10 border-b border-zinc-200/40 dark:border-zinc-800/40">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-zinc-200/50 dark:border-zinc-700/50 aspect-square">
            {room.avatar_url ? (
              <img src={room.avatar_url} alt={room.name} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                {room.name}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono shrink-0">
                Room
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {room.topic || "Collaborative multi-bot room"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Assigned Team Pips */}
          <div className="flex items-center gap-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 p-1.5 px-2.5 rounded-2xl shrink-0">
            {!isCompact && (
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                Squad ({assignedBots.length}):
              </span>
            )}
            <div className="flex items-center -space-x-2">
              {assignedBots.map((bot) => {
                const isChief = bot.id === room.chief_bot_id
                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => handleMentionBot(bot.username || bot.name.toLowerCase())}
                    className="relative hover:scale-115 hover:z-20 transition-all focus:outline-none cursor-pointer"
                    title={`@${bot.username || bot.name.toLowerCase()} (${bot.name})${isChief ? " • Chief Agent" : ""}`}
                  >
                    <BotAvatar3D
                      shape={bot.shape}
                      color={bot.color}
                      trimColor={bot.trim_color}
                      screenColor={bot.screen_color}
                      status={bot.status}
                      size={30}
                      antenna={false}
                    />
                    {isChief && (
                      <span className="absolute -top-1.5 -right-1 z-10 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-xs">
                        <Crown className="w-2.5 h-2.5 fill-black" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons: 3-Dot Dropdown if Compact, or Individual Buttons if Wide */}
          {isCompact ? (
            <div className="relative" ref={menuRef}>
              <RaisedButton
                variant={isMenuOpen ? "primary" : "secondary"}
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="!w-8 !h-8 !p-0 !rounded-xl"
                title="Room Options (Files, Edit, Clear)"
              >
                <MoreHorizontal className="w-4 h-4" />
              </RaisedButton>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  {/* Files Workspace Toggle */}
                  {onTogglePanel && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        onTogglePanel()
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-500" />
                        <span>Files Workspace</span>
                      </div>
                      {filesCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 font-bold">
                          {filesCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Edit Room */}
                  {onEditRoom && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        onEditRoom()
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                    >
                      <Pencil className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      <span>Edit Room</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Clear Chat */}
                  {onClearChat && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        setIsClearModalOpen(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                    >
                      <Eraser className="w-4 h-4 text-red-500" />
                      <span>Clear Chat</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Edit Room Button */}
              {onEditRoom && (
                <RaisedButton
                  variant="secondary"
                  size="sm"
                  onClick={onEditRoom}
                  className="gap-1.5 !rounded-xl !h-8 !px-2.5 text-xs"
                  title="Edit Room details, avatar and Chief Agent"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </RaisedButton>
              )}

              {/* Clear Chat Button */}
              {onClearChat && (
                <RaisedButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsClearModalOpen(true)}
                  className="gap-1.5 !rounded-xl !h-8 !px-2.5 text-xs hover:text-red-500"
                  title="Clear Room chat screen"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </RaisedButton>
              )}

              {/* Files Toggle Button */}
              {onTogglePanel && (
                <RaisedButton
                  variant={isPanelOpen ? "primary" : "secondary"}
                  size="sm"
                  onClick={onTogglePanel}
                  className="gap-1.5 !rounded-xl !h-8 !px-3"
                  title="Toggle squad workspace files"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Files</span>
                  {filesCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-300/60 dark:bg-zinc-700/60 font-mono font-medium">
                      {filesCount}
                    </span>
                  )}
                </RaisedButton>
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((m) => {
          const isUser = m.role === "user"
          const isSystem = m.role === "system"
          const botSender = assignedBots.find((b) => b.name === m.sender_name)
          const isCurrentlyStreamingThis = isStreaming && m.id === activeStreamMsgId

          if (isSystem) {
            return (
              <div key={m.id} className="py-2 text-center text-xs text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
                <div className="inline-block px-4 py-2 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  {m.content}
                </div>
              </div>
            )
          }

          return (
            <div
              key={m.id}
              className={`flex gap-3.5 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              {!isUser && botSender && (
                <BotAvatar3D
                  shape={botSender.shape}
                  color={botSender.color}
                  trimColor={botSender.trim_color}
                  screenColor={botSender.screen_color}
                  status={isCurrentlyStreamingThis ? "working" : botSender.status}
                  size={38}
                  antenna={false}
                  className="mt-1 shrink-0"
                />
              )}

              <div className="space-y-1.5 min-w-0">
                <div className={`flex items-center gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {m.sender_name}
                  </span>
                  {!isUser && botSender && (
                    <>
                      {botSender.id === room.chief_bot_id && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                          <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          Chief
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        @{botSender.username || botSender.name.toLowerCase()}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[150px]">
                        ({botSender.role})
                      </span>
                    </>
                  )}
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Attached Image inside Bubble */}
                {m.image_url && (
                  <div className="rounded-2xl overflow-hidden max-w-sm mb-1.5 shadow-sm border border-zinc-200/60 dark:border-zinc-700/60">
                    <img
                      src={m.image_url}
                      alt="Attached vision"
                      className="w-full h-auto object-cover max-h-64"
                    />
                  </div>
                )}

                {/* RareUI AI Status Component (Shimmer while thinking, "Worked for {time}s" when done) */}
                {!isUser && (
                  <div className="mb-1">
                    {isCurrentlyStreamingThis ? (
                      <AiStatus
                        isStreaming={true}
                        statusText={streamingStatusText}
                        elapsedSeconds={streamingElapsed}
                        reasoning={m.reasoning}
                      />
                    ) : (
                      <AiStatus
                        status="done"
                        durationSeconds={m.duration_seconds}
                        reasoning={m.reasoning}
                      />
                    )}
                  </div>
                )}

                {/* Markdown Message Bubble */}
                {(m.content || isCurrentlyStreamingThis) && (
                  <div
                    className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-sm ${isUser
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium rounded-tr-sm"
                      : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-tl-sm"
                      }`}
                  >
                    {m.content ? (
                      <Markdown>{m.content}</Markdown>
                    ) : (
                      <span className="inline-block w-2 h-4 bg-zinc-400 dark:bg-zinc-500 animate-pulse rounded-xs" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area with GAIA Composer */}
      <div className="p-4 sm:p-5 bg-background shrink-0">
        {/* Mention helper pill bar with @all and @username */}
        {assignedBots.length > 0 && (
          <div className="flex items-center gap-1.5 pb-2.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 shrink-0">
              <AtSign className="w-3 h-3" /> Mention:
            </span>
            <button
              type="button"
              onClick={() => handleMentionBot("all")}
              className="px-2.5 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900 dark:text-purple-300 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer border border-purple-300/40 dark:border-purple-800/50"
              title="Mention all bots in room"
            >
              @all
            </button>
            {assignedBots.map((bot) => {
              const handle = bot.username || bot.name.toLowerCase().replace(/[^a-z0-9_]/g, "")
              return (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => handleMentionBot(handle)}
                  className="px-2.5 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer font-mono"
                  title={`${bot.name} (${bot.role})`}
                >
                  @{handle}
                </button>
              )
            })}
          </div>
        )}

        <GaiaComposer
          value={inputText}
          onChange={setInputText}
          onSubmit={handleSubmit}
          placeholder="Talk with the squad, use @all or mention specific bot with @username..."
          disabled={isSending || isStreaming}
          isLoading={isSending || isStreaming}
          attachedImage={attachedImage}
          onRemoveImage={() => setAttachedImage(null)}
          onAttachImage={handleAttachImage}
          isUploading={isUploading}
        />
      </div>

      {/* Clear Chat Confirmation Modal - RareUI Dialog */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear Room Chat?"
        description="This will clear previous messages from your current screen view without deleting them from the database archive."
        confirmText="Clear Chat"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          setIsClearModalOpen(false)
          setMessages([])
          if (onClearChat) {
            onClearChat()
          }
        }}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  )
}
