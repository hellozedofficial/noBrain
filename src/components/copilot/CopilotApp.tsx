"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Rocket,
  Users,
  Plus,
  FolderOpen,
  ArrowLeft,
  Pencil,
  Pin,
  Eraser,
  Crown,
  MoreHorizontal,
  Puzzle,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CopilotBot, CopilotRoom, CopilotMessage, CopilotFile } from "@/lib/copilot/types"
import { BotAvatar3D } from "./BotAvatar3D"
import { RobotHeadStudioModal } from "./RobotHeadStudioModal"
import { CreateRoomModal } from "./CreateRoomModal"
import { IntegrationsModal } from "./IntegrationsModal"
import { RoomChatView } from "./RoomChatView"
import { CopilotComputerPanel } from "./CopilotComputerPanel"
import { YouTubeStudioPanel } from "./YouTubeStudioPanel"
import { YouTubeMiniPlayer } from "./YouTubeMiniPlayer"
import { Markdown } from "@/components/ui/markdown"
import { RaisedButton } from "@/components/ui/raised-button"
import { DeleteButton } from "@/components/ui/delete-button"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { RareToaster, rareToast } from "@/components/ui/rare-toast"
import { GaiaComposer } from "./GaiaComposer"
import { AiStatus } from "@/components/ui/ai-status"

interface CopilotAppProps {
  initialCode?: string | null
}

export function CopilotApp({ initialCode = null }: CopilotAppProps) {
  const router = useRouter()
  const [bots, setBots] = useState<CopilotBot[]>([])
  const [rooms, setRooms] = useState<CopilotRoom[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  // Direct bot state
  const [directMessages, setDirectMessages] = useState<CopilotMessage[]>([])
  const [files, setFiles] = useState<CopilotFile[]>([])

  // Room state
  const [roomMessages, setRoomMessages] = useState<CopilotMessage[]>([])
  const [roomAssignedBots, setRoomAssignedBots] = useState<CopilotBot[]>([])
  const [roomFiles, setRoomFiles] = useState<CopilotFile[]>([])

  // Modals & UI states
  const [isStudioOpen, setIsStudioOpen] = useState(false)
  const [editingBot, setEditingBot] = useState<CopilotBot | null>(null)
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<CopilotRoom | null>(null)
  const [isClearBotChatOpen, setIsClearBotChatOpen] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [activeRightTab, setActiveRightTab] = useState<"files" | "youtube">("youtube")
  const [inputMessage, setInputMessage] = useState("")
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Streaming & Live AI Status states
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingStatusText, setStreamingStatusText] = useState("Thinking...")
  const [streamingElapsed, setStreamingElapsed] = useState(0)
  const [activeStreamMsgId, setActiveStreamMsgId] = useState<string | null>(null)

  // Resizable Right Sidebar (up to 50% screen width)
  const [panelWidth, setPanelWidth] = useState<number>(420)
  const [isResizingPanel, setIsResizingPanel] = useState<boolean>(false)

  // Integrations Modal state
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false)
  const [connectedIntegrationsCount, setConnectedIntegrationsCount] = useState(0)
  const [modelNames, setModelNames] = useState<Record<string, string>>({
    "nobrain-1.5": "noBrain 1.5",
  })

  const fetchIntegrationsSummary = async () => {
    try {
      const res = await fetch("/api/copilot/integrations")
      if (res.ok) {
        const d = await res.json()
        const count = (d.integrations || []).filter((i: any) => i.status === "connected").length
        setConnectedIntegrationsCount(count)
      }
    } catch { }
  }

  useEffect(() => {
    fetchIntegrationsSummary()
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.models)) {
          const map: Record<string, string> = { "nobrain-1.5": "noBrain 1.5" }
          for (const m of data.models) {
            if (m.id && m.name) map[m.id] = m.name
          }
          setModelNames(map)
        }
      })
      .catch(() => {})

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const integrationParam = params.get("integration")
      if (
        integrationParam === "gmail_connected" ||
        integrationParam === "drive_connected" ||
        integrationParam === "google_connected"
      ) {
        fetchIntegrationsSummary()
        const label = integrationParam === "drive_connected" ? "Google Drive" : "Google Account"
        rareToast.success(`${label} Connected`, "Connected via OAuth successfully")
        window.history.replaceState({}, "", window.location.pathname)
      } else if (params.get("oauth_error")) {
        rareToast.error("Google OAuth Error", params.get("oauth_error") || "OAuth authorization failed")
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [])
  const isResizingRef = useRef(false)
  const [isBotMenuOpen, setIsBotMenuOpen] = useState(false)
  const botMenuRef = useRef<HTMLDivElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Click outside to close bot 3-dot dropdown menu
  useEffect(() => {
    if (!isBotMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (botMenuRef.current && !botMenuRef.current.contains(e.target as Node)) {
        setIsBotMenuOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [isBotMenuOpen])

  useEffect(() => {
    // Load persisted width if available
    try {
      const saved = localStorage.getItem("nobrain_copilot_panel_width")
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= 300) {
          const maxAllowed = Math.floor(window.innerWidth * 0.5)
          setPanelWidth(Math.min(parsed, maxAllowed))
        }
      }
    } catch (e) {
      // ignore local storage error
    }
  }, [])

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingPanel(true)
    isResizingRef.current = true

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return
      // Calculate new width from right side of window
      const newWidth = window.innerWidth - moveEvent.clientX
      const minWidth = 300
      const maxWidth = Math.floor(window.innerWidth * 0.5) // Up to 50% of screen width

      const clamped = Math.max(minWidth, Math.min(newWidth, maxWidth))
      setPanelWidth(clamped)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      setIsResizingPanel(false)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      setPanelWidth((w) => {
        try {
          localStorage.setItem("nobrain_copilot_panel_width", w.toString())
        } catch (e) { }
        return w
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedBotId) {
      loadBotDetails(selectedBotId)
      if (typeof window !== "undefined" && window.location.pathname !== `/workspace/c/${selectedBotId}`) {
        window.history.pushState(null, "", `/workspace/c/${selectedBotId}`)
      }
    }
  }, [selectedBotId])

  useEffect(() => {
    if (selectedRoomId) {
      loadRoomDetails(selectedRoomId)
      if (typeof window !== "undefined" && window.location.pathname !== `/workspace/c/${selectedRoomId}`) {
        window.history.pushState(null, "", `/workspace/c/${selectedRoomId}`)
      }
    }
  }, [selectedRoomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [directMessages, isSending, isStreaming])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      const [bRes, rRes] = await Promise.all([
        fetch("/api/copilot/bots"),
        fetch("/api/copilot/rooms"),
      ])
      if (bRes.ok && rRes.ok) {
        const bData = await bRes.json()
        const rData = await rRes.json()
        const fetchedBots: CopilotBot[] = bData.bots || []
        const fetchedRooms: CopilotRoom[] = rData.rooms || []
        setBots(fetchedBots)
        setRooms(fetchedRooms)

        if (initialCode) {
          const matchedBot = fetchedBots.find((b) => b.id === initialCode)
          const matchedRoom = fetchedRooms.find((r) => r.id === initialCode)
          if (matchedBot) {
            setSelectedBotId(matchedBot.id)
            setSelectedRoomId(null)
            return
          } else if (matchedRoom) {
            setSelectedRoomId(matchedRoom.id)
            setSelectedBotId(null)
            return
          }
        }

        if (fetchedBots.length > 0) {
          setSelectedBotId(fetchedBots[0].id)
          setSelectedRoomId(null)
        } else if (fetchedRooms.length > 0) {
          setSelectedRoomId(fetchedRooms[0].id)
          setSelectedBotId(null)
        }
      }
    } catch (e) {
      console.error("Failed to load initial copilot data:", e)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBotDetails = async (botId: string) => {
    try {
      const res = await fetch(`/api/copilot/bots/${botId}`)
      if (res.ok) {
        const data = await res.json()
        setDirectMessages(data.messages || [])
        setFiles(data.files || [])
        setBots((prev) => prev.map((b) => (b.id === botId ? data.bot : b)))
      }
    } catch (e) {
      console.error("Failed to load bot details:", e)
    }
  }

  const loadRoomDetails = async (roomId: string) => {
    try {
      const res = await fetch(`/api/copilot/rooms/${roomId}`)
      if (res.ok) {
        const data = await res.json()
        setRoomMessages(data.messages || [])
        setRoomAssignedBots(data.assignedBots || [])
        setRoomFiles(data.files || [])
        if (data.room) {
          setRooms((prev) => prev.map((r) => (r.id === roomId ? data.room : r)))
        }
        if (Array.isArray(data.assignedBots) && data.assignedBots.length > 0) {
          const updatedMap = new Map<string, CopilotBot>(
            data.assignedBots.map((b: CopilotBot) => [b.id, b])
          )
          setBots((prev) => prev.map((b) => updatedMap.get(b.id) || b))
        }
      }
    } catch (e) {
      console.error("Failed to load room details:", e)
    }
  }

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

  const handleSaveBot = async (data: any) => {
    if (editingBot) {
      try {
        const res = await fetch(`/api/copilot/bots/${editingBot.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          const result = await res.json()
          if (data.is_pinned) {
            setRooms((prev) => prev.map((r) => ({ ...r, is_pinned: false })))
            setBots((prev) => {
              const updated = prev.map((b) => (b.id === editingBot.id ? result.bot : { ...b, is_pinned: false }))
              return [...updated].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            })
          } else {
            setBots((prev) => prev.map((b) => (b.id === editingBot.id ? result.bot : b)))
          }
          setIsStudioOpen(false)
          setEditingBot(null)
          rareToast.success("Copilot Updated", `${result.bot.name} changes saved`)
        } else {
          const errData = await res.json().catch(() => ({}))
          rareToast.error("Update Failed", errData.error || "Could not update bot")
        }
      } catch (e: any) {
        console.error("Failed to update bot:", e)
        rareToast.error("Error", e.message || "Could not update copilot")
      }
    } else {
      try {
        const res = await fetch("/api/copilot/bots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          const result = await res.json()
          if (data.is_pinned) {
            setRooms((prev) => prev.map((r) => ({ ...r, is_pinned: false })))
            setBots((prev) => [result.bot, ...prev.map((b) => ({ ...b, is_pinned: false }))])
          } else {
            setBots((prev) => [result.bot, ...prev])
          }
          setSelectedRoomId(null)
          setSelectedBotId(result.bot.id)
          setIsStudioOpen(false)
          rareToast.success("Copilot Deployed", `${result.bot.name} is ready`)
        } else {
          const errData = await res.json().catch(() => ({}))
          rareToast.error("Deployment Failed", errData.error || "Could not deploy bot")
        }
      } catch (e) {
        console.error("Failed to deploy bot:", e)
        rareToast.error("Error", "Could not deploy copilot")
      }
    }
  }

  const handleSaveRoom = async (data: any) => {
    if (editingRoom) {
      try {
        const res = await fetch(`/api/copilot/rooms/${editingRoom.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          const result = await res.json()
          if (data.is_pinned) {
            setBots((prev) => prev.map((b) => ({ ...b, is_pinned: false })))
            setRooms((prev) => {
              const updated = prev.map((r) => (r.id === editingRoom.id ? result.room : { ...r, is_pinned: false }))
              return [...updated].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            })
          } else {
            setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? result.room : r)))
          }
          setIsCreateRoomOpen(false)
          setEditingRoom(null)
          rareToast.success("Room Updated", result.room.name)
        } else {
          const errData = await res.json().catch(() => ({}))
          rareToast.error("Update Failed", errData.error || "Could not update room")
        }
      } catch (e: any) {
        console.error("Failed to update room:", e)
        rareToast.error("Error", e.message || "Could not update room")
      }
    } else {
      try {
        const res = await fetch("/api/copilot/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          const result = await res.json()
          if (data.is_pinned) {
            setBots((prev) => prev.map((b) => ({ ...b, is_pinned: false })))
            setRooms((prev) => [result.room, ...prev.map((r) => ({ ...r, is_pinned: false }))])
          } else {
            setRooms((prev) => [result.room, ...prev])
          }
          setSelectedBotId(null)
          setSelectedRoomId(result.room.id)
          setIsCreateRoomOpen(false)
          rareToast.success("Room Launched", result.room.name)
        } else {
          const errData = await res.json().catch(() => ({}))
          rareToast.error("Launch Failed", errData.error || "Could not launch room")
        }
      } catch (e) {
        console.error("Failed to launch room:", e)
        rareToast.error("Error", "Could not launch room")
      }
    }
  }

  const handleClearBotChat = async () => {
    if (!selectedBotId) return
    try {
      setDirectMessages([])
      const now = new Date().toISOString()
      const res = await fetch(`/api/copilot/bots/${selectedBotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleared_at: now }),
      })
      if (res.ok) {
        rareToast.info("Chat Cleared", "Messages cleared from view")
      } else {
        rareToast.error("Clear Chat Failed")
      }
    } catch (e) {
      console.error("Clear bot chat error:", e)
      rareToast.error("Clear Chat Failed")
    }
  }

  const handleClearRoomChat = async () => {
    if (!selectedRoomId) return
    try {
      setRoomMessages([])
      const now = new Date().toISOString()
      const res = await fetch(`/api/copilot/rooms/${selectedRoomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleared_at: now }),
      })
      if (res.ok) {
        rareToast.info("Room Chat Cleared", "Messages cleared from view")
      } else {
        rareToast.error("Clear Chat Failed")
      }
    } catch (e) {
      console.error("Clear room chat error:", e)
      rareToast.error("Clear Chat Failed")
    }
  }

  const handleDeleteBot = async (botId: string) => {
    try {
      const res = await fetch(`/api/copilot/bots/${botId}`, { method: "DELETE" })
      if (res.ok) {
        const updated = bots.filter((b) => b.id !== botId)
        setBots(updated)
        if (selectedBotId === botId) {
          setSelectedBotId(updated[0]?.id || null)
        }
        rareToast.info("Copilot Removed")
      }
    } catch (e) {
      console.error("Failed to delete bot:", e)
      rareToast.error("Delete Error", "Could not remove copilot")
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/copilot/rooms/${roomId}`, { method: "DELETE" })
      if (res.ok) {
        const updated = rooms.filter((r) => r.id !== roomId)
        setRooms(updated)
        if (selectedRoomId === roomId) {
          setSelectedRoomId(updated[0]?.id || null)
        }
        rareToast.info("Room Deleted")
      }
    } catch (e) {
      console.error("Failed to delete room:", e)
      rareToast.error("Delete Error", "Could not delete room")
    }
  }

  const handleSaveWorkspaceFile = async (path: string, content: string) => {
    try {
      const payload: any = { path, content }
      if (selectedRoomId) {
        payload.roomId = selectedRoomId
      } else if (selectedBotId) {
        payload.botId = selectedBotId
      } else {
        return
      }

      const res = await fetch("/api/copilot/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        if (selectedRoomId) {
          loadRoomDetails(selectedRoomId)
        } else if (selectedBotId) {
          loadBotDetails(selectedBotId)
        }
      }
    } catch (e) {
      console.error("Failed to save file:", e)
    }
  }

  const handleDeleteWorkspaceFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/copilot/files?fileId=${fileId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        if (selectedRoomId) {
          loadRoomDetails(selectedRoomId)
        } else if (selectedBotId) {
          loadBotDetails(selectedBotId)
        }
      }
    } catch (e) {
      console.error("Failed to delete file:", e)
    }
  }

  // Streaming implementation for direct bot chat
  const handleSendDirectMessage = async () => {
    if ((!inputMessage.trim() && !attachedImage) || !selectedBotId || isSending) return

    const userText = inputMessage.trim() || (attachedImage ? "Inspect this image" : "")
    const imgUrl = attachedImage?.url || null

    setInputMessage("")
    setAttachedImage(null)
    setIsSending(true)

    // 1. Optimistic user bubble
    const tempUserMsg: CopilotMessage = {
      id: `temp_${Date.now()}`,
      user_id: "user",
      bot_id: selectedBotId,
      sender_name: "You",
      role: "user",
      content: userText,
      image_url: imgUrl,
      created_at: new Date().toISOString(),
    }

    // 2. Optimistic assistant streaming bubble
    const streamMsgId = `stream_${Date.now()}`
    const activeBotName = activeBot?.name || "Copilot"
    const streamingAssistantMsg: CopilotMessage = {
      id: streamMsgId,
      user_id: "assistant",
      bot_id: selectedBotId,
      sender_name: activeBotName,
      role: "assistant",
      content: "",
      reasoning: "",
      duration_seconds: null,
      created_at: new Date().toISOString(),
    }

    setDirectMessages((prev) => [...prev, tempUserMsg, streamingAssistantMsg])
    setActiveStreamMsgId(streamMsgId)
    setIsStreaming(true)
    setStreamingStatusText("Thinking...")
    setStreamingElapsed(0)

    const startTime = Date.now()
    const timerInterval = setInterval(() => {
      setStreamingElapsed(Number(((Date.now() - startTime) / 1000).toFixed(1)))
    }, 100)

    try {
      const res = await fetch(`/api/copilot/bots/${selectedBotId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, imageUrl: imgUrl }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setDirectMessages((prev) => prev.filter((m) => m.id !== streamMsgId))
        throw new Error(errData.error || "Failed to connect to copilot stream")
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""
      let fullReasoning = ""

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

            if (payload.type === "status" && payload.statusText) {
              setStreamingStatusText(payload.statusText)
            } else if (payload.type === "tool") {
              if (payload.data?.youtubePlayer) {
                window.dispatchEvent(new CustomEvent("nobrain:youtube_player", { detail: payload.data.youtubePlayer }))
                setActiveRightTab("youtube")
                setIsPanelOpen(true)
              }
            } else if (payload.type === "reasoning" && payload.text) {
              fullReasoning += payload.text
              setDirectMessages((prev) =>
                prev.map((m) => (m.id === streamMsgId ? { ...m, reasoning: fullReasoning } : m))
              )
            } else if (payload.type === "token" && payload.text) {
              fullContent += payload.text
              setDirectMessages((prev) =>
                prev.map((m) => (m.id === streamMsgId ? { ...m, content: fullContent } : m))
              )
            } else if (payload.type === "done") {
              const dur = payload.data?.durationSeconds ?? Number(((Date.now() - startTime) / 1000).toFixed(1))
              setDirectMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId
                    ? {
                      ...m,
                      id: payload.data?.messageId || m.id,
                      content: fullContent || payload.data?.reply || m.content,
                      reasoning: fullReasoning || payload.data?.reasoning || m.reasoning,
                      duration_seconds: dur,
                    }
                    : m
                )
              )
              if (typeof payload.data?.botMemory === "string") {
                setBots((prev) =>
                  prev.map((b) =>
                    b.id === selectedBotId ? { ...b, memory: payload.data.botMemory } : b
                  )
                )
              }
            }
          } catch (e) {
            console.error("Stream parse error:", e)
          }
        }
      }
    } catch (e: any) {
      console.error("Failed to stream message:", e)
      rareToast.error("Stream Error", e.message || "Failed to communicate with copilot")
    } finally {
      clearInterval(timerInterval)
      setIsStreaming(false)
      setIsSending(false)
      setActiveStreamMsgId(null)
      loadBotDetails(selectedBotId)
    }
  }

  const activeBot = bots.find((b) => b.id === selectedBotId)
  const activeRoom = rooms.find((r) => r.id === selectedRoomId)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      <RareToaster />

      {/* Copilot Left Explorer Navigation - Borderless Gaia Style */}
      <div className="w-72 bg-zinc-50/80 dark:bg-[#121212] flex flex-col shrink-0 border-r border-zinc-200/50 dark:border-zinc-800/50">
        {/* Header Bar */}
        <div className="h-16 px-5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 hover:opacity-85 transition-opacity"
          >
            <div className="p-2 rounded-2xl bg-zinc-200/90 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block text-zinc-900 dark:text-zinc-100">
                noBrain Copilot
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block -mt-0.5 font-medium">
                3D Autonomous Agents
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
            title="Back to chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Action Tactile Buttons with GAIA RaisedButton */}
        <div className="px-4 py-2 grid grid-cols-2 gap-2">
          <RaisedButton
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingBot(null)
              setIsStudioOpen(true)
            }}
            className="w-full gap-1.5 !rounded-2xl"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bot</span>
          </RaisedButton>

          <RaisedButton
            variant="secondary"
            size="sm"
            onClick={() => setIsCreateRoomOpen(true)}
            className="w-full gap-1.5 !rounded-2xl"
          >
            <Users className="w-3.5 h-3.5" />
            <span>New Room</span>
          </RaisedButton>
        </div>

        {/* Tree List: Rooms & Individual Copilots */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Section 1: Rooms */}
          <div>
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Rooms ({rooms.length})</span>
            </div>
            {rooms.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 italic">
                No rooms created
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedBotId(null)
                      setSelectedRoomId(room.id)
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer group ${selectedRoomId === room.id
                      ? "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold shadow-sm"
                      : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-zinc-300/50 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 flex items-center justify-center overflow-hidden aspect-square shrink-0">
                        {room.avatar_url ? (
                          <img src={room.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs truncate">{room.name}</span>
                          {room.is_pinned && (
                            <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {room.assigned_bot_ids.length} Copilots
                        </div>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingRoom(room)
                          setIsCreateRoomOpen(true)
                        }}
                        title="Edit Room"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <DeleteButton
                        size="icon"
                        onDelete={() => handleDeleteRoom(room.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Direct Copilots */}
          <div>
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Copilots ({bots.length})</span>
            </div>
            {bots.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 italic">
                No copilots deployed
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {bots.map((bot) => (
                  <div
                    key={bot.id}
                    onClick={() => {
                      setSelectedRoomId(null)
                      setSelectedBotId(bot.id)
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer group ${selectedBotId === bot.id
                      ? "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold shadow-sm"
                      : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BotAvatar3D
                        shape={bot.shape}
                        color={bot.color}
                        trimColor={bot.trim_color}
                        screenColor={bot.screen_color}
                        status={bot.status}
                        size={32}
                        antenna={false}
                        interactive={false}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-medium truncate">{bot.name}</span>
                          {bot.is_pinned && (
                            <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0">
                            @{bot.username || bot.name.toLowerCase()}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {bot.role}
                        </div>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingBot(bot)
                          setIsStudioOpen(true)
                        }}
                        title="Edit Copilot"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <DeleteButton
                        size="icon"
                        onDelete={() => handleDeleteBot(bot.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workspace Sidebar Footer: Integrations Button */}
        <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <button
            type="button"
            onClick={() => setIsIntegrationsOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-2xl bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-zinc-900/90 dark:hover:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-800 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:scale-105 transition-transform shrink-0">
                <Puzzle className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <span>Integrations</span>
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {connectedIntegrationsCount > 0
                    ? `${connectedIntegrationsCount} connected`
                    : "Gmail & tools"}
                </div>
              </div>
            </div>
            {connectedIntegrationsCount > 0 ? (
              "") : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                8 Apps
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Center Area: Room View OR Direct Bot Workspace + Persistent Right Panel */}
      <div className="flex-1 flex h-full min-w-0 overflow-hidden relative">
        {/* Left Chat Area (Room or Bot or Empty) */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {selectedRoomId && activeRoom ? (
            <RoomChatView
              room={activeRoom}
              assignedBots={roomAssignedBots}
              messages={roomMessages}
              filesCount={roomFiles.length}
              isPanelOpen={isPanelOpen}
              activeRightTab={activeRightTab}
              panelWidth={panelWidth}
              onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
              onToggleTab={(tab) => {
                if (isPanelOpen && activeRightTab === tab) {
                  setIsPanelOpen(false)
                } else {
                  setActiveRightTab(tab)
                  setIsPanelOpen(true)
                }
              }}
              onReloadRoom={() => loadRoomDetails(selectedRoomId)}
              onEditRoom={() => {
                setEditingRoom(activeRoom)
                setIsCreateRoomOpen(true)
              }}
              onClearChat={handleClearRoomChat}
            />
          ) : selectedBotId && activeBot ? (
          <div className="flex-1 flex flex-col h-full min-w-0">
            {/* Direct Bot Header - Borderless Gaia Style */}
            <div className="h-16 px-6 flex items-center justify-between shrink-0 bg-background/90 backdrop-blur-md z-10 border-b border-zinc-200/40 dark:border-zinc-800/40">
              <div className="flex items-center gap-3.5 min-w-0">
                <BotAvatar3D
                  shape={activeBot.shape}
                  color={activeBot.color}
                  trimColor={activeBot.trim_color}
                  screenColor={activeBot.screen_color}
                  status={isStreaming ? "working" : activeBot.status}
                  size={46}
                  antenna={true}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                      {activeBot.name}
                    </h2>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                      @{activeBot.username || activeBot.name.toLowerCase()}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 font-mono">
                      {modelNames[activeBot.model || "nobrain-1.5"] || activeBot.model || "noBrain 1.5"}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isStreaming || activeBot.status === "working"
                        ? "text-blue-600 bg-blue-500/15 dark:text-blue-400"
                        : activeBot.status === "thinking"
                          ? "text-amber-600 bg-amber-500/15 dark:text-amber-400"
                          : "text-emerald-600 bg-emerald-500/15 dark:text-emerald-400"
                        }`}
                    >
                      {isStreaming ? "working" : activeBot.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{activeBot.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isPanelOpen && panelWidth >= 360 ? (
                  <div className="relative" ref={botMenuRef}>
                    <RaisedButton
                      variant={isBotMenuOpen ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setIsBotMenuOpen(!isBotMenuOpen)}
                      className="!w-8 !h-8 !p-0 !rounded-xl"
                      title="Copilot Options (Files, Edit, Clear)"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </RaisedButton>

                    {isBotMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                        {/* YouTube Studio */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBotMenuOpen(false)
                            if (isPanelOpen && activeRightTab === "youtube") {
                              setIsPanelOpen(false)
                            } else {
                              setActiveRightTab("youtube")
                              setIsPanelOpen(true)
                            }
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2">
                            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-red-500">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            <span>YouTube Studio</span>
                          </div>
                        </button>

                        {/* Files Workspace */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBotMenuOpen(false)
                            if (isPanelOpen && activeRightTab === "files") {
                              setIsPanelOpen(false)
                            } else {
                              setActiveRightTab("files")
                              setIsPanelOpen(true)
                            }
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-blue-500" />
                            <span>Files Workspace</span>
                          </div>
                          {files.length > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 font-bold">
                              {files.length}
                            </span>
                          )}
                        </button>

                        {/* Edit Copilot */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBotMenuOpen(false)
                            setEditingBot(activeBot)
                            setIsStudioOpen(true)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                        >
                          <Pencil className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                          <span>Edit Copilot</span>
                        </button>

                        <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                        {/* Clear Chat */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBotMenuOpen(false)
                            setIsClearBotChatOpen(true)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                        >
                          <Eraser className="w-4 h-4 text-red-500" />
                          <span>Clear Chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <RaisedButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingBot(activeBot)
                        setIsStudioOpen(true)
                      }}
                      className="gap-1.5 !rounded-xl !h-8 !px-3"
                      title="Edit Copilot details and 3D appearance"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </RaisedButton>

                    <RaisedButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsClearBotChatOpen(true)}
                      className="gap-1.5 !rounded-xl !h-8 !px-2.5 text-xs hover:text-red-500"
                      title="Clear chat screen"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Clear</span>
                    </RaisedButton>

                    {/* YouTube Studio Button */}
                    <RaisedButton
                      variant={isPanelOpen && activeRightTab === "youtube" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => {
                        if (isPanelOpen && activeRightTab === "youtube") {
                          setIsPanelOpen(false)
                        } else {
                          setActiveRightTab("youtube")
                          setIsPanelOpen(true)
                        }
                      }}
                      className="gap-1.5 !rounded-xl !h-8 !px-3"
                      title="Toggle YouTube Media Player & Research Studio"
                    >
                      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 fill-current text-red-500">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <span>YouTube</span>
                    </RaisedButton>

                    {/* Files Toggle Button */}
                    <RaisedButton
                      variant={isPanelOpen && activeRightTab === "files" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => {
                        if (isPanelOpen && activeRightTab === "files") {
                          setIsPanelOpen(false)
                        } else {
                          setActiveRightTab("files")
                          setIsPanelOpen(true)
                        }
                      }}
                      className="gap-1.5 !rounded-xl !h-8 !px-3"
                      title="Toggle Workspace Files"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>Files</span>
                      {files.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-300/60 dark:bg-zinc-700/60 font-mono font-medium">
                          {files.length}
                        </span>
                      )}
                    </RaisedButton>
                  </>
                )}
              </div>
            </div>

            {/* Split Screen: Messages + Computer Panel */}
            <div className="flex-1 flex min-h-0 relative">
              <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {directMessages.map((m) => {
                    const isUser = m.role === "user"
                    const isCurrentlyStreamingThis = isStreaming && m.id === activeStreamMsgId

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3.5 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        {!isUser && (
                          <BotAvatar3D
                            shape={activeBot.shape}
                            color={activeBot.color}
                            trimColor={activeBot.trim_color}
                            screenColor={activeBot.screen_color}
                            status={isCurrentlyStreamingThis ? "working" : activeBot.status}
                            size={36}
                            antenna={false}
                            className="mt-1 shrink-0"
                          />
                        )}

                        <div className="space-y-1.5 min-w-0">
                          {/* Attached Vision Image */}
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

                          {/* Markdown message body (Streamed in real-time) */}
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

                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block px-1 font-mono">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Direct Message Input with GAIA Composer */}
                <div className="p-4 sm:p-5 bg-background shrink-0">
                  <GaiaComposer
                    value={inputMessage}
                    onChange={setInputMessage}
                    onSubmit={handleSendDirectMessage}
                    placeholder={`Assign a task or talk to ${activeBot.name} (@${activeBot.username || activeBot.name.toLowerCase()})...`}
                    disabled={isSending || isStreaming}
                    isLoading={isSending || isStreaming}
                    attachedImage={attachedImage}
                    onRemoveImage={() => setAttachedImage(null)}
                    onAttachImage={handleAttachImage}
                    isUploading={isUploading}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 dark:text-zinc-400">
              <Rocket className="w-14 h-14 text-zinc-400 dark:text-zinc-600 mb-3" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Select or Create a Copilot
              </h3>
              <p className="text-xs max-w-sm mb-4">
                Deploy custom 3D TV-headed robot agents or launch collaborative multi-bot rooms.
              </p>
              <div className="flex gap-2.5">
                <RaisedButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingBot(null)
                    setIsStudioOpen(true)
                  }}
                >
                  Create Bot
                </RaisedButton>
                <RaisedButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateRoomOpen(true)}
                >
                  Create Room
                </RaisedButton>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Right Side Drawer: YouTube Studio OR Files Panel (Kept mounted so video player never unmounts) */}
        <div
          style={{ width: `${panelWidth}px` }}
          className={`relative h-full shrink-0 border-l border-zinc-200/50 dark:border-zinc-800/50 flex-col bg-background ${
            isPanelOpen ? "flex" : "hidden"
          }`}
        >
          {/* Drag Resize Handle on left border - drag up to 50% of screen */}
          <div
            onMouseDown={startResizing}
            className={`absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-30 flex items-center justify-center group hover:bg-blue-500/10 transition-colors ${
              isResizingPanel ? "bg-blue-500/20" : ""
            }`}
            title="Drag to resize panel (up to 50% of screen)"
          >
            <div
              className={`w-1 h-8 rounded-full transition-colors ${
                isResizingPanel ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700 group-hover:bg-blue-500"
              }`}
            />
          </div>

          {/* Right Drawer Top Tab Switcher */}
          <div className="h-11 px-3 bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between shrink-0 backdrop-blur-md">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveRightTab("youtube")}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeRightTab === "youtube"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                }`}
              >
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 fill-current">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span>YouTube Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab("files")}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeRightTab === "files"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>Files ({selectedRoomId ? roomFiles.length : files.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Collapse Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Persistent Panels: YouTube Studio and Files Drawer (Kept mounted for continuous playback) */}
          <div className={`flex-1 min-h-0 ${activeRightTab === "youtube" ? "flex flex-col h-full overflow-hidden" : "hidden"}`}>
            <YouTubeStudioPanel
              bot={activeBot}
              room={activeRoom}
              onSendPromptToChat={(p) => setInputMessage(p)}
              onSaveFile={handleSaveWorkspaceFile}
              onOpenFilesTab={() => setActiveRightTab("files")}
              isExternalVisible={isPanelOpen && activeRightTab === "youtube"}
              onExpandToHome={() => {
                setActiveRightTab("youtube")
                setIsPanelOpen(true)
              }}
            />
          </div>

          <div className={`flex-1 min-h-0 ${activeRightTab === "files" ? "flex flex-col h-full overflow-hidden" : "hidden"}`}>
            <CopilotComputerPanel
              bot={activeBot}
              room={activeRoom}
              files={selectedRoomId ? roomFiles : files}
              onSaveFile={handleSaveWorkspaceFile}
              onDeleteFile={handleDeleteWorkspaceFile}
            />
          </div>
        </div>
      </div>

      {/* 3D Robot Head Studio Modal */}
      <RobotHeadStudioModal
        isOpen={isStudioOpen}
        initialBot={editingBot}
        onClose={() => {
          setIsStudioOpen(false)
          setEditingBot(null)
        }}
        onSave={handleSaveBot}
      />

      {/* Multi-bot Room Modal */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        initialRoom={editingRoom}
        onClose={() => {
          setIsCreateRoomOpen(false)
          setEditingRoom(null)
        }}
        availableBots={bots}
        onSaveRoom={handleSaveRoom}
      />

      {/* Integrations Modal */}
      <IntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        onIntegrationsChanged={fetchIntegrationsSummary}
      />

      {/* Clear Bot Chat Confirmation Modal - RareUI Dialog */}
      <ConfirmModal
        isOpen={isClearBotChatOpen}
        title="Clear Copilot Chat?"
        description="This will clear previous messages from your current chat."
        confirmText="Clear Chat"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          setIsClearBotChatOpen(false)
          handleClearBotChat()
        }}
        onCancel={() => setIsClearBotChatOpen(false)}
      />
      {/* Global Transparent Overlay during panel drag resizing */}
      {isResizingPanel && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto" />
      )}
    </div>
  )
}
