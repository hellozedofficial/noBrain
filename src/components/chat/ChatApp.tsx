"use client"

import React, { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Sidebar, Conversation } from "@/components/chat/Sidebar"
import { ChatView, ChatMessage } from "@/components/chat/ChatView"
import { AuthModal, User } from "@/components/auth/AuthModal"
import {
  ThemeMode,
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  getStoredSidebarOpen,
  setStoredSidebarOpen,
} from "@/lib/theme"
import { generateChatId } from "@/lib/utils"
import { SettingsModal } from "@/components/settings/SettingsModal"
import { CanvasPanel } from "@/components/canvas/CanvasPanel"
import { extractCanvasDesignFromMarkdown, dispatchCanvasDesign } from "@/lib/canvas/bridge"

export const APP_MODEL_NAME = "nobrain-1.5"

function sanitizeModel(model: string | undefined): string {
  return APP_MODEL_NAME
}

interface ChatAppProps {
  initialConversationId?: string | null
}

export function ChatApp({ initialConversationId = null }: ChatAppProps = {}) {
  const routeParams = useParams()
  const urlParamId = (routeParams?.id as string) || initialConversationId || null

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(urlParamId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [isLoadingList, setIsLoadingList] = useState(true)

  // Auth, Model, and Theme states
  const [user, setUser] = useState<User | null>(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSaleonicConnected, setIsSaleonicConnected] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(APP_MODEL_NAME)
  const [theme, setTheme] = useState<ThemeMode>("system")
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isCheckingBalance, setIsCheckingBalance] = useState(false)

  // Sidebar responsive state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Canvas Studio Workspace state (80% width inside chat)
  const [isCanvasOpen, setIsCanvasOpen] = useState(false)
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  const handleToggleCanvas = () => {
    setIsCanvasOpen((prev) => {
      const next = !prev
      if (next) {
        setIsSidebarOpen(false)
      }
      return next
    })
  }

  // Listen for open-canvas requests from design cards or custom events
  useEffect(() => {
    const handleCanvasOpenRequest = () => {
      setIsCanvasOpen(true)
      setIsSidebarOpen(false)
    }
    window.addEventListener("nobrain:open-canvas-request", handleCanvasOpenRequest)
    return () => window.removeEventListener("nobrain:open-canvas-request", handleCanvasOpenRequest)
  }, [])

  // Sync activeId with URL param if it changes
  useEffect(() => {
    if (urlParamId && urlParamId !== activeId) {
      setActiveId(urlParamId)
    }
  }, [urlParamId])

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/chat\/([a-zA-Z0-9]+)/)
      if (match && match[1]) {
        setActiveId(match[1])
      } else {
        setActiveId(null)
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Check login state on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          if (data.user?.last_used_model) {
            setSelectedModel(APP_MODEL_NAME)
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e)
      }
    }
    checkAuth()
  }, [])

  // Check Saleonic connection status on mount
  useEffect(() => {
    async function checkSaleonic() {
      try {
        const res = await fetch("/api/saleonic/config")
        if (res.ok) {
          const data = await res.json()
          setIsSaleonicConnected(!!data.connected)
        }
      } catch (err) {
        console.error("Failed to check Saleonic config status:", err)
      }
    }
    checkSaleonic()
  }, [])

  // Check wallet balance on mount and when user changes
  useEffect(() => {
    async function checkWalletBalance() {
      if (!user) {
        setWalletBalance(0)
        return
      }
      
      setIsCheckingBalance(true)
      try {
        // Use server action to get wallet balance
        const response = await fetch('/api/wallet')
        if (response.ok) {
          const data = await response.json()
          setWalletBalance(parseFloat(data.balance) || 0)
        }
      } catch (err) {
        console.error("Failed to check wallet balance:", err)
        setWalletBalance(0)
      } finally {
        setIsCheckingBalance(false)
      }
    }

    checkWalletBalance()
  }, [user])

  // Apply saved theme & track mobile viewport
  useEffect(() => {
    const savedTheme = getStoredTheme()
    setTheme(savedTheme)
    applyTheme(savedTheme)

    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(getStoredSidebarOpen())
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleToggleTheme = () => {
    const modes: ThemeMode[] = ["system", "light", "dark"]
    const nextIdx = (modes.indexOf(theme) + 1) % modes.length
    const nextTheme = modes[nextIdx]
    setTheme(nextTheme)
    setStoredTheme(nextTheme)
    applyTheme(nextTheme)
  }

  const handleToggleSidebar = () => {
    const nextState = !isSidebarOpen
    setIsSidebarOpen(nextState)
    if (!isMobile) {
      setStoredSidebarOpen(nextState)
    }
  }

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false)
    if (!isMobile) {
      setStoredSidebarOpen(false)
    }
  }

  // Load conversations list
  const loadConversations = async () => {
    try {
      setIsLoadingList(true)
      const res = await fetch("/api/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error("Error loading conversations:", err)
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [user])

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/conversations/${activeId}`)
        if (!res.ok) {
          return
        }
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        }
        setSelectedModel(APP_MODEL_NAME)
      } catch (err) {
        console.error("Error loading chat messages:", err)
      }
    }

    loadMessages()
  }, [activeId])

  const handleNewChat = () => {
    if (isStreaming) {
      handleStop()
    }
    setActiveId(null)
    setMessages([])
    setStreamingText("")
    setInput("")
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState(null, "", "/")
    }
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (activeId === id) {
          handleNewChat()
        }
      }
    } catch (err) {
      console.error("Error deleting conversation:", err)
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStreamingText("")
  }

  const handleSelectModel = (model: string) => {
    setSelectedModel(APP_MODEL_NAME)
  }

  const handleSend = async (
    content: string,
    attachedImage?: { url: string; dataUrl?: string; filename: string } | null,
    isGoogleSearch?: boolean
  ) => {
    const trimmed = content.trim()
    if (!trimmed && !attachedImage) return

    let currentConvId = activeId
    if (!currentConvId) {
      currentConvId = generateChatId()
      setActiveId(currentConvId)
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `/chat/${currentConvId}`)
      }
      const newTitle = trimmed.length > 30 ? trimmed.substring(0, 30) + "..." : trimmed || "Image Query"
      setConversations((prev) => [
        {
          id: currentConvId!,
          title: newTitle,
          model: selectedModel,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ])
    }

    const tempUserMsgId = `user_${Date.now()}`
    const newUserMsg: ChatMessage = {
      id: tempUserMsgId,
      role: "user",
      content: trimmed,
      model: selectedModel,
      image_url: attachedImage?.url || null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, newUserMsg])
    setInput("")
    setIsStreaming(true)
    setStreamingText("")

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConvId,
          message: trimmed,
          imageUrl: attachedImage?.url || null,
          imageDataUrl: attachedImage?.dataUrl || null,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Error ${response.status}: Failed to get response`
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error("No response body available")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ""
      let finalUsage: any = null
      let serverAssistantMsgId: string | null = null
      let buffer = ""
      let hasDispatchedLiveDesign = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith("data:")) continue

          const jsonStr = trimmedLine.replace(/^data:\s*/, "")
          if (jsonStr === "[DONE]") {
            continue
          }

          try {
            const data = JSON.parse(jsonStr)

            if (data.type === "meta") {
              if (data.conversationId && data.conversationId !== activeId) {
                setActiveId(data.conversationId)
                if (
                  typeof window !== "undefined" &&
                  window.location.pathname !== `/chat/${data.conversationId}`
                ) {
                  window.history.pushState(null, "", `/chat/${data.conversationId}`)
                }
              }
            } else if (data.type === "token" && data.token) {
              accumulatedText += data.token
              setStreamingText(accumulatedText)

              // Check if streaming text has a completed or parseable canvas design
              if (!hasDispatchedLiveDesign && (accumulatedText.includes("```canvas") || accumulatedText.includes('"format"') || accumulatedText.includes('"isLogo"'))) {
                const liveDesign = extractCanvasDesignFromMarkdown(accumulatedText)
                if (liveDesign) {
                  hasDispatchedLiveDesign = true
                  setIsCanvasOpen(true)
                  setIsSidebarOpen(false)
                  setTimeout(() => {
                    dispatchCanvasDesign(liveDesign)
                  }, 100)
                }
              }
            } else if (data.type === "done") {
              if (data.usage) finalUsage = data.usage
              if (data.messageId) serverAssistantMsgId = data.messageId
            }
          } catch {
            // ignore malformed SSE
          }
        }
      }

      if (accumulatedText.trim()) {
        const finalDesign = extractCanvasDesignFromMarkdown(accumulatedText)
        if (finalDesign) {
          setIsCanvasOpen(true)
          setIsSidebarOpen(false)
          if (!hasDispatchedLiveDesign) {
            setTimeout(() => {
              dispatchCanvasDesign(finalDesign)
            }, 150)
          }
        }

        const assistantMsg: ChatMessage = {
          id: serverAssistantMsgId || `asst_${Date.now()}`,
          role: "assistant",
          content: accumulatedText,
          model: selectedModel,
          prompt_tokens: finalUsage?.prompt_tokens,
          completion_tokens: finalUsage?.completion_tokens,
          total_tokens: finalUsage?.total_tokens,
          created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, assistantMsg])
      }

      loadConversations()
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat streaming aborted by user")
      } else {
        console.error("Chat error:", err)
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Error:** ${err.message || "Failed to generate response. Please try again."}`,
          model: selectedModel,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } finally {
      setIsStreaming(false)
      setStreamingText("")
      abortControllerRef.current = null
    }
  }

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser)
    loadConversations()
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      handleNewChat()
      loadConversations()
    } catch (e) {
      console.error("Logout failed:", e)
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeId)
  const currentTitle = activeConversation?.title || "New Chat"

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => {
          if (isStreaming) handleStop()
          setActiveId(id)
          if (typeof window !== "undefined" && window.location.pathname !== `/chat/${id}`) {
            window.history.pushState(null, "", `/chat/${id}`)
          }
          if (isMobile || isCanvasOpen) setIsSidebarOpen(false)
        }}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isLoadingList={isLoadingList}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onCloseSidebar={handleCloseSidebar}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSaleonicConnected={isSaleonicConnected}
        isCanvasOpen={isCanvasOpen}
        onOpenCanvas={() => {
          setIsCanvasOpen(true)
          setIsSidebarOpen(false)
        }}
        walletBalance={walletBalance}
        isCheckingBalance={isCheckingBalance}
      />

      {/* Main Chat View */}
      <ChatView
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={handleStop}
        currentTitle={currentTitle}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        isCanvasOpen={isCanvasOpen}
        onToggleCanvas={handleToggleCanvas}
        onNewChat={handleNewChat}
      />

      {/* noBrain Canvas Studio Panel (80% screen width inside chat) */}
      <CanvasPanel
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        isFullscreen={isCanvasFullscreen}
        onToggleFullscreen={() => setIsCanvasFullscreen(!isCanvasFullscreen)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Settings & Saleonic Integrations Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChange={(connected) => setIsSaleonicConnected(connected)}
      />
    </div>
  )
}
