"use client"

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  Play,
  Pause,
  Search,
  ListPlus,
  BookOpen,
  Sparkles,
  ExternalLink,
  Trash2,
  Download,
  Clock,
  Eye,
  Check,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Plus,
  FolderOpen,
  FolderPlus,
  Bot,
  Layers,
  X,
  Volume2,
  Compass,
  PictureInPicture2,
} from "lucide-react"
import { RaisedButton } from "@/components/ui/raised-button"
import { rareToast } from "@/components/ui/rare-toast"
import { CustomVideoPlayer, CustomVideoPlayerHandle } from "@/components/copilot/CustomVideoPlayer"
import { CopilotBot, CopilotRoom } from "@/lib/copilot/types"
import {
  ShortlistFolder,
  DEFAULT_FOLDERS,
  YouTubePlaylistItem,
  YouTubePlayerNote,
} from "@/lib/copilot/youtubeTypes"

interface YouTubeStudioPanelProps {
  bot?: CopilotBot | null
  room?: CopilotRoom | null
  onSendPromptToChat?: (prompt: string) => void
  onSaveFile?: (path: string, content: string) => void
  onOpenFilesTab?: () => void
  isExternalVisible?: boolean
  onExpandToHome?: () => void
}

type StudioTab = "home" | "explore" | "shortlist" | "notes"

const TOPIC_PILLS = [""
]

const FOLDER_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"]

export function YouTubeStudioPanel({
  bot,
  room,
  onSendPromptToChat,
  onSaveFile,
  onOpenFilesTab,
  isExternalVisible = true,
  onExpandToHome,
}: YouTubeStudioPanelProps) {
  // Auth & Connection State
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Navigation & Player State
  const [activeTab, setActiveTab] = useState<StudioTab>("home")
  const [currentVideo, setCurrentVideo] = useState<YouTubePlaylistItem | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const isPlayingRef = useRef<boolean>(false)
  const [queue, setQueue] = useState<YouTubePlaylistItem[]>([])
  const [folders, setFolders] = useState<ShortlistFolder[]>(DEFAULT_FOLDERS)
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all")
  const [notes, setNotes] = useState<YouTubePlayerNote[]>([])

  // Notes inputs
  const [newNoteText, setNewNoteText] = useState("")
  const [newNoteTime, setNewNoteTime] = useState("01:30")

  // Home Recommendations State
  const [recommendations, setRecommendations] = useState<YouTubePlaylistItem[]>([])
  const [recommendationTopic, setRecommendationTopic] = useState("Curated AI & Tech Insights")
  const [recommendationReason, setRecommendationReason] = useState("Recommended for You")
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)

  // Explore & Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<YouTubePlaylistItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState("Top AI Agents 2026")

  // Folder creation modal state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])
  const [newFolderDesc, setNewFolderDesc] = useState("")
  const [seekRequest, setSeekRequest] = useState<{ seconds: number; ts: number } | null>(null)

  // Docked Home Slot & Floating PiP Morph State
  const homeSlotRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const playerControlRef = useRef<CustomVideoPlayerHandle | null>(null)
  const didDragRef = useRef<boolean>(false)

  const [isPipMode, setIsPipMode] = useState(false)
  const [pipWidth, setPipWidth] = useState(340)
  const [pipPos, setPipPos] = useState<{ x: number; y: number }>({ x: 24, y: 24 })
  const [isInteractingPip, setIsInteractingPip] = useState(false)
  const [isScrollingHome, setIsScrollingHome] = useState(false)
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [homeRect, setHomeRect] = useState<{
    top: number
    left: number
    width: number
    height: number
    clipTop: number
    clipBottom: number
    valid: boolean
  }>({
    top: 140,
    left: 800,
    width: 360,
    height: 202,
    clipTop: 0,
    clipBottom: 0,
    valid: false,
  })

  const isHomeViewActive = isExternalVisible && activeTab === "home"
  const prevHomeViewActiveRef = useRef<boolean>(isHomeViewActive)

  const handlePlayStateChange = useCallback((playing: boolean) => {
    isPlayingRef.current = playing
    setIsPlaying(playing)
  }, [])

  // Measure the Home slot bounding box and scroll clipping
  const measureHomeSlot = useCallback(() => {
    if (!homeSlotRef.current) return
    const slotRect = homeSlotRef.current.getBoundingClientRect()
    if (slotRect.width < 10 || slotRect.height < 10) return

    const scrollRect = scrollContainerRef.current?.getBoundingClientRect()
    const clipTop = scrollRect ? Math.max(0, scrollRect.top - slotRect.top) : 0
    const clipBottom = scrollRect ? Math.max(0, slotRect.bottom - scrollRect.bottom) : 0

    setHomeRect({
      top: slotRect.top,
      left: slotRect.left,
      width: slotRect.width,
      height: slotRect.height,
      clipTop,
      clipBottom,
      valid: true,
    })
  }, [])

  // Initialize default PiP position to bottom-right on client mount
  useEffect(() => {
    setIsMounted(true)
    const defaultW = 340
    const defaultH = Math.round((defaultW * 9) / 16)
    setPipPos({
      x: Math.max(16, window.innerWidth - defaultW - 24),
      y: Math.max(16, window.innerHeight - defaultH - 24),
    })
  }, [])

  // Track Home Slot geometry via ResizeObserver + Window Resize
  useLayoutEffect(() => {
    if (!isHomeViewActive || !currentVideo) return
    measureHomeSlot()

    const ro = new ResizeObserver(() => {
      measureHomeSlot()
    })
    if (homeSlotRef.current) ro.observe(homeSlotRef.current)
    if (scrollContainerRef.current) ro.observe(scrollContainerRef.current)

    const handleWinResize = () => measureHomeSlot()
    window.addEventListener("resize", handleWinResize)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", handleWinResize)
    }
  }, [isHomeViewActive, currentVideo, measureHomeSlot])

  // Transition between Docked Home and Floating PiP when leaving/entering Home
  useLayoutEffect(() => {
    const wasHome = prevHomeViewActiveRef.current
    prevHomeViewActiveRef.current = isHomeViewActive

    if (wasHome && !isHomeViewActive) {
      // Leaving Home tab / YouTube drawer -> float into PiP if video is currently playing
      if (currentVideo && isPlayingRef.current) {
        setIsPipMode(true)
      } else {
        setIsPipMode(false)
      }
    } else if (!wasHome && isHomeViewActive) {
      // Returning to Home tab -> dock back into Home slot with smooth morph animation
      measureHomeSlot()
      setIsPipMode(false)
    }
  }, [isHomeViewActive, currentVideo, measureHomeSlot])

  // Drag handler for moving the Floating PiP Card anywhere on screen
  const handlePipDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startX = pipPos.x
      const startY = pipPos.y
      const pipH = Math.round((pipWidth * 9) / 16)
      didDragRef.current = false

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startMouseX
        const dy = moveEvent.clientY - startMouseY
        if (Math.hypot(dx, dy) > 4) {
          didDragRef.current = true
          setIsInteractingPip(true)
        }
        if (didDragRef.current) {
          const nextX = Math.max(12, Math.min(window.innerWidth - pipWidth - 12, startX + dx))
          const nextY = Math.max(12, Math.min(window.innerHeight - pipH - 12, startY + dy))
          setPipPos({ x: nextX, y: nextY })
        }
      }

      const handleMouseUp = () => {
        setIsInteractingPip(false)
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }

      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [pipPos.x, pipPos.y, pipWidth]
  )

  // Resize handler for resizing the Floating PiP Card from any corner or edge
  const handlePipResizeMouseDown = useCallback(
    (dir: "nw" | "ne" | "sw" | "se" | "w" | "e", e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const startMouseX = e.clientX
      const startWidth = pipWidth
      const startHeight = Math.round((startWidth * 9) / 16)
      const startX = pipPos.x
      const startY = pipPos.y
      setIsInteractingPip(true)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startMouseX
        const isLeft = dir.includes("w")
        const isTop = dir.includes("n")
        const rawWidth = isLeft ? startWidth - dx : startWidth + dx
        const maxAllowedW = Math.min(680, window.innerWidth - 24)
        const nextWidth = Math.max(240, Math.min(maxAllowedW, rawWidth))
        const nextHeight = Math.round((nextWidth * 9) / 16)

        let nextX = startX
        let nextY = startY
        if (isLeft) {
          nextX = startX + (startWidth - nextWidth)
        }
        if (isTop) {
          nextY = startY + (startHeight - nextHeight)
        }

        nextX = Math.max(12, Math.min(window.innerWidth - nextWidth - 12, nextX))
        nextY = Math.max(12, Math.min(window.innerHeight - nextHeight - 12, nextY))

        setPipWidth(nextWidth)
        setPipPos({ x: nextX, y: nextY })
      }

      const handleMouseUp = () => {
        setIsInteractingPip(false)
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }

      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [pipWidth, pipPos.x, pipPos.y]
  )

  const handleReturnToHomeFromPip = useCallback(() => {
    onExpandToHome?.()
    setActiveTab("home")
  }, [onExpandToHome])

  const handleClosePip = useCallback(() => {
    setIsPipMode(false)
    handlePlayStateChange(false)
  }, [handlePlayStateChange])

  // Verify YouTube connection
  const checkYouTubeAuth = async () => {
    try {
      setIsCheckingAuth(true)
      const res = await fetch("/api/copilot/integrations")
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.integrations || []
        const yt = list.find((i: any) => i.provider === "youtube" && i.status === "connected")
        setIsConnected(Boolean(yt))
      } else {
        setIsConnected(false)
      }
    } catch {
      setIsConnected(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  // Fetch initial player state from server
  const fetchPlayerState = async () => {
    try {
      const res = await fetch("/api/copilot/youtube/player")
      if (res.ok) {
        const data = await res.json()
        if (data.currentVideo) {
          setCurrentVideo(data.currentVideo)
        }
        if (Array.isArray(data.queue)) setQueue(data.queue)
        if (Array.isArray(data.folders) && data.folders.length > 0) setFolders(data.folders)
        if (Array.isArray(data.notes)) setNotes(data.notes)
      }
    } catch (e) {
      console.warn("Could not fetch YouTube player state:", e)
    }
  }

  // Fetch smart adaptive recommendations
  const fetchRecommendations = async () => {
    try {
      setIsLoadingRecommendations(true)
      const res = await fetch("/api/copilot/youtube?action=recommendations")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.videos)) {
          const mapped = data.videos.map((v: any) => {
            const vid = v.videoId || v.id
            const thumb =
              v.thumbnail ||
              v.thumbnailUrl ||
              (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80")
            return {
              id: vid,
              title: v.title,
              channelTitle: v.channelTitle,
              channelId: v.channelId,
              thumbnailUrl: thumb,
              views: v.views,
              publishedAt: v.publishedAt,
            }
          })
          setRecommendations(mapped)
          if (data.topic) setRecommendationTopic(data.topic)
          if (data.reason) setRecommendationReason(data.reason)
        }
      }
    } catch (e) {
      console.warn("Failed to fetch recommendations:", e)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  // Initial load
  useEffect(() => {
    checkYouTubeAuth()
    fetchPlayerState()
    fetchRecommendations()
  }, [])

  // Listen for agent-driven live player events
  useEffect(() => {
    const handleAgentPlayerEvent = (e: any) => {
      const detail = e.detail || {}
      if (detail.video) {
        setCurrentVideo(detail.video)
        handlePlayStateChange(true)
        setActiveTab("home")
        rareToast.success("Playing Video", detail.video.title)
      }
      if (detail.queue) {
        setQueue(detail.queue)
      }
      if (detail.folders) {
        setFolders(detail.folders)
      }
      if (detail.note) {
        setNotes((prev) => [detail.note, ...prev])
        rareToast.success("Research Note Added", detail.note.text)
      }
      fetchPlayerState()
    }

    window.addEventListener("nobrain:youtube_player", handleAgentPlayerEvent)
    return () => window.removeEventListener("nobrain:youtube_player", handleAgentPlayerEvent)
  }, [handlePlayStateChange])

  // Perform search via YouTube API
  const handleSearch = async (queryToSearch: string) => {
    if (!queryToSearch.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/copilot/youtube?q=${encodeURIComponent(queryToSearch)}&maxResults=8`)
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.videos || []).map((v: any) => {
          const vid = v.videoId || v.id
          const thumb =
            v.thumbnail ||
            v.thumbnailUrl ||
            (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80")
          return {
            id: vid,
            title: v.title,
            channelTitle: v.channelTitle,
            channelId: v.channelId,
            thumbnailUrl: thumb,
            views: v.views,
            publishedAt: v.publishedAt,
          }
        })
        setSearchResults(mapped)
      }
    } catch (e) {
      console.warn("YouTube search error:", e)
    } finally {
      setIsSearching(false)
    }
  }

  // Play a video
  const handlePlayVideo = async (video: YouTubePlaylistItem) => {
    setCurrentVideo(video)
    handlePlayStateChange(true)
    setIsPipMode(false)
    setActiveTab("home")

    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "play",
          videoId: video.id,
          title: video.title,
        }),
      })
    } catch {}
  }

  // Stop / Dismiss current player so Home returns to Discovery Hub
  const handleStopPlayer = async () => {
    setCurrentVideo(null)
    handlePlayStateChange(false)
    setIsPipMode(false)
    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })
    } catch {}
    rareToast.info("Player Reset", "Viewing YouTube Studio Discovery Hub")
  }

  // Add video to queue/shortlist with optional folder
  const handleAddToQueue = async (video: YouTubePlaylistItem, targetFolderId = "default") => {
    const existing = queue.find((q) => q.id === video.id)
    if (existing && existing.folderId === targetFolderId) {
      rareToast.info("Already Shortlisted", video.title)
      return
    }

    const videoWithFolder = { ...video, folderId: targetFolderId }
    const updatedQueue = existing
      ? queue.map((q) => (q.id === video.id ? videoWithFolder : q))
      : [...queue, videoWithFolder]

    setQueue(updatedQueue)
    const folderObj = folders.find((f) => f.id === targetFolderId)
    rareToast.success("Added to Shortlist", `Saved in "${folderObj?.name || "General Shortlist"}"`)

    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shortlist",
          videoId: video.id,
          title: video.title,
          folderId: targetFolderId,
        }),
      })
    } catch {}
  }

  // Move video to different folder
  const handleMoveVideoFolder = async (videoId: string, targetFolderId: string) => {
    const updated = queue.map((v) => (v.id === videoId ? { ...v, folderId: targetFolderId } : v))
    setQueue(updated)
    const folderObj = folders.find((f) => f.id === targetFolderId)
    rareToast.success("Video Moved", `Moved to "${folderObj?.name || "Target Folder"}"`)

    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move_video_folder",
          videoId,
          folderId: targetFolderId,
        }),
      })
    } catch {}
  }

  // Remove from queue
  const handleRemoveFromQueue = async (videoId: string) => {
    const updated = queue.filter((q) => q.id !== videoId)
    setQueue(updated)
    rareToast.info("Removed from Shortlist")

    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_from_queue",
          videoId,
        }),
      })
    } catch {}
  }

  // Create custom shortlist folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    const newId = "folder_" + Date.now().toString(36)
    const newFolder: ShortlistFolder = {
      id: newId,
      name: newFolderName.trim(),
      color: newFolderColor,
      description: newFolderDesc.trim() || `Research collection for ${newFolderName.trim()}`,
      createdAt: new Date().toISOString(),
    }

    const updated = [...folders, newFolder]
    setFolders(updated)
    setSelectedFolderId(newId)
    setIsCreatingFolder(false)
    setNewFolderName("")
    setNewFolderDesc("")
    rareToast.success("Folder Created", `Created collection "${newFolder.name}"`)

    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          folderName: newFolder.name,
          color: newFolder.color,
          description: newFolder.description,
        }),
      })
    } catch {}
  }

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    if (folderId === "default") {
      rareToast.error("Protected Folder", "The default shortlist folder cannot be deleted.")
      return
    }
    const updatedFolders = folders.filter((f) => f.id !== folderId)
    const updatedQueue = queue.map((v) => (v.folderId === folderId ? { ...v, folderId: "default" } : v))
    setFolders(updatedFolders)
    setQueue(updatedQueue)
    setSelectedFolderId("all")
    rareToast.info("Folder Removed", "Videos moved back to General Shortlist")

    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_folder",
          folderId,
        }),
      })
    } catch {}
  }

  // Assign Folder to Copilot Agent
  const handleAssignFolderToCopilot = (folder: ShortlistFolder) => {
    if (!onSendPromptToChat) return
    const folderVideos = queue.filter((v) => (v.folderId || "default") === folder.id)

    if (folderVideos.length === 0) {
      rareToast.error("Folder Empty", `No videos in "${folder.name}" to assign.`)
      return
    }

    const target = bot ? `@${bot.username || bot.name.toLowerCase()}` : "@all"
    const videoListFormatted = folderVideos
      .map(
        (v, idx) =>
          `${idx + 1}. [${v.title}](https://www.youtube.com/watch?v=${v.id}) (Channel: ${v.channelTitle || "YouTube"})`
      )
      .join("\n")

    const prompt = `${target} Please perform a synthesized comparative analysis of the ${folderVideos.length} research videos in the "${folder.name}" collection:\n\n${videoListFormatted}\n\nDeliverables:\n1. Key architectural patterns & comparative breakdown\n2. Practical implementation takeaways for our team\n3. Save the full research executive summary in workspace file "${folder.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_research.md"`

    onSendPromptToChat(prompt)
    rareToast.success("Assigned to Squad", `Analyzing ${folderVideos.length} videos from "${folder.name}"`)
  }

  // Add timestamped note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteText.trim() || !currentVideo) return

    const parts = newNoteTime.split(":").map((p) => parseInt(p, 10))
    let sec = 0
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      sec = parts[0] * 60 + parts[1]
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      sec = parts[0]
    }

    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`

    const newNote: YouTubePlayerNote = {
      id: "note_" + Date.now(),
      videoId: currentVideo.id,
      videoTitle: currentVideo.title,
      timestampSeconds: sec,
      timestampFormatted: formatted,
      text: newNoteText.trim(),
      author: "You",
      createdAt: new Date().toISOString(),
    }

    setNotes((prev) => [newNote, ...prev])
    setNewNoteText("")
    rareToast.success("Research Note Saved", `Timestamp [${formatted}]`)

    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_note",
          videoId: currentVideo.id,
          title: currentVideo.title,
          noteText: newNote.text,
          timestampSeconds: sec,
          author: "You",
        }),
      })
    } catch {}
  }

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    try {
      await fetch("/api/copilot/youtube/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_note", noteId }),
      })
    } catch {}
  }

  // Seek custom player to timestamp
  const handleSeekTo = (seconds: number = 0) => {
    setActiveTab("home")
    setSeekRequest({ seconds, ts: Date.now() })
  }

  // Export Shortlist to Workspace File
  const handleExportShortlistToWorkspace = () => {
    if (!onSaveFile) return
    const md = `# 🎬 YouTube Research Collections & Shortlists\n\nGenerated on ${new Date().toLocaleDateString()} by noBrain Copilot Workspace.\n\n${folders
      .map((f) => {
        const vids = queue.filter((v) => (v.folderId || "default") === f.id)
        if (vids.length === 0) return ""
        return `## 📁 ${f.name} (${vids.length} videos)\n${f.description ? `*${f.description}*\n\n` : ""}${vids
          .map(
            (v, i) =>
              `### ${i + 1}. [${v.title}](https://www.youtube.com/watch?v=${v.id})\n- **Channel:** ${v.channelTitle || "YouTube"}\n- **Video ID:** \`${v.id}\`\n- **Views:** ${v.views?.toLocaleString() || "N/A"}\n`
          )
          .join("\n")}`
      })
      .filter(Boolean)
      .join("\n\n---\n\n")}\n\n---\n*Exported directly into Workspace Files.*`

    onSaveFile("youtube_research_shortlist.md", md)
    rareToast.success("Shortlist Exported", "Saved as youtube_research_shortlist.md")
    if (onOpenFilesTab) onOpenFilesTab()
  }

  // Export Notes to Workspace File
  const handleExportNotesToWorkspace = () => {
    if (!onSaveFile) return
    const md = `# 📝 AI Video Research Notes & Timeline\n\nGenerated on ${new Date().toLocaleDateString()} by noBrain Copilot Workspace.\n\n## ⏱️ Key Takeaways (${notes.length})\n\n${notes
      .map(
        (n) =>
          `- **[${n.timestampFormatted || "00:00"}](https://www.youtube.com/watch?v=${n.videoId}&t=${n.timestampSeconds || 0}s)** (*${n.author || "Note"}* - ${n.videoTitle || "Video"}): ${n.text}`
      )
      .join("\n")}\n\n---\n*Exported by noBrain Copilot Studio.*`

    onSaveFile("youtube_video_notes.md", md)
    rareToast.success("Notes Exported", "Saved as youtube_video_notes.md")
    if (onOpenFilesTab) onOpenFilesTab()
  }

  // Ask Copilot to analyze currently playing video
  const handleAskCopilot = () => {
    if (!onSendPromptToChat || !currentVideo) return
    const target = bot ? `@${bot.username || bot.name.toLowerCase()}` : "@all"
    const prompt = `${target} Please summarize this YouTube video: "${currentVideo.title}" (URL: https://www.youtube.com/watch?v=${currentVideo.id}).`
    onSendPromptToChat(prompt)
    rareToast.success("Sent to Copilot", "Analyzing video in chat...")
  }

  // 1. Loading State
  if (isCheckingAuth) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-zinc-950 text-zinc-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
        <p className="text-xs font-medium">Checking YouTube connection...</p>
      </div>
    )
  }

  // 2. Integration Gate (When YouTube is NOT connected)
  if (!isConnected) {
    const handleConnectYouTube = () => {
      const returnTo = window.location.pathname + window.location.search
      window.location.href = `/api/auth/google?service=youtube&returnTo=${encodeURIComponent(returnTo)}`
    }

    return (
      <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto select-none p-6">
        <div className="max-w-md mx-auto my-auto flex flex-col items-center text-center space-y-6">
          {/* YouTube 3D Raised Hero Icon */}
          <div className="relative w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl bg-gradient-to-b from-red-500 via-red-600 to-rose-700 before:absolute before:inset-0 before:border-t before:border-white/50 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:rounded-3xl">
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 fill-white drop-shadow-md">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Connect YouTube Studio</h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              Connect your Google account with YouTube permissions to unlock agentic video exploration, custom research folders, smart player controls, and autonomous squad analysis.
            </p>
          </div>

          {/* Features Highlights */}
          <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Play className="w-3 h-3 text-red-400 fill-red-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Autonomous Video Player</p>
                <p className="text-[11px] text-zinc-400">Embedded 16:9 player and background mini-player that persists across room switches.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <FolderOpen className="w-3 h-3 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Shortlist Folders & Squad Assignments</p>
                <p className="text-[11px] text-zinc-400">Organize research into collections and assign full folders to AI agents for deep reports.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Adaptive Recommendations</p>
                <p className="text-[11px] text-zinc-400">Smart discovery feed tailored to your team’s watch history and research topics.</p>
              </div>
            </div>
          </div>

          {/* Connect Action Button */}
          <div className="w-full space-y-2.5">
            <RaisedButton
              variant="primary"
              size="sm"
              onClick={handleConnectYouTube}
              className="w-full !h-9 !rounded-xl text-xs font-semibold gap-2 cursor-pointer"
            >
              <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-white">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span>Connect YouTube Account</span>
            </RaisedButton>

            <button
              type="button"
              onClick={checkYouTubeAuth}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Already connected? Refresh Status</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. Full Studio Panel (Connected)
  const filteredQueue =
    selectedFolderId === "all"
      ? queue
      : queue.filter((v) => (v.folderId || "default") === selectedFolderId)

  const activeFolderObj = folders.find((f) => f.id === selectedFolderId)

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="shrink-0 px-4 py-3 bg-zinc-900/70 border-b border-zinc-800/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-md bg-gradient-to-b from-red-500 to-red-600 before:absolute before:inset-0 before:border-t before:border-white/40 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:rounded-xl">
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white tracking-wide truncate">YouTube Studio</h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/80">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate">Agentic Media & Research Player</p>
          </div>
        </div>

        {/* Global Action Link */}
        <div className="flex items-center gap-1.5">
          {currentVideo && (
            <a
              href={`https://www.youtube.com/watch?v=${currentVideo.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Open video on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="shrink-0 px-3 py-2 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("home")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "home"
              ? "bg-zinc-800 text-white border border-zinc-700/80 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("explore")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "explore"
              ? "bg-zinc-800 text-white border border-zinc-700/80 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Explore</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shortlist")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "shortlist"
              ? "bg-zinc-800 text-white border border-zinc-700/80 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Shortlist</span>
          {queue.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-700/70 text-zinc-200 font-mono">
              {queue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "notes"
              ? "bg-zinc-800 text-white border border-zinc-700/80 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Notes</span>
          {notes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-700/70 text-zinc-200 font-mono">
              {notes.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content View */}
      <div
        ref={scrollContainerRef}
        onScroll={() => {
          setIsScrollingHome(true)
          measureHomeSlot()
          if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
          scrollTimerRef.current = setTimeout(() => setIsScrollingHome(false), 120)
        }}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
      >
        {/* ==================== TAB 1: HOME (PLAYER & RECOMMENDATIONS) ==================== */}
        {activeTab === "home" && (
          <div className="space-y-4">
            {/* Active Video Player (Collapsible / Closable) */}
            {currentVideo ? (
              <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/80 shadow-xl space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
                    Now Playing
                  </span>
                  <button
                    type="button"
                    onClick={handleStopPlayer}
                    className="px-2 py-0.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                    title="Close player and browse Discovery Hub"
                  >
                    <span>Close Player</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Home Dock Target Slot (Portal player morphs directly into this slot) */}
                <div
                  ref={homeSlotRef}
                  className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-zinc-800/80"
                />

                {/* Video Info Header */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                    {currentVideo.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="truncate">{currentVideo.channelTitle || "YouTube"}</span>
                    {currentVideo.views && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Eye className="w-3 h-3" />
                        {currentVideo.views.toLocaleString()} views
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Player Actions (Platform RaisedButton Sizing & Variants) */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                  <RaisedButton
                    variant="primary"
                    size="sm"
                    onClick={handleAskCopilot}
                    className="flex-1 !h-8 !px-3 !rounded-xl text-xs gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Ask Copilot to Analyze</span>
                  </RaisedButton>

                  <RaisedButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddToQueue(currentVideo, "default")}
                    className="!h-8 !px-3 !rounded-xl text-xs gap-1.5 cursor-pointer"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Shortlist</span>
                  </RaisedButton>
                </div>
              </div>
            ) : (
              /* Discovery Welcome Hero (When no video is playing) */
              <div className="rounded-2xl p-4 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800/80 shadow-md space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white tracking-wide">YouTube Research & Discovery Hub</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Browse AI agent research, trending developer insights, and customized recommendations below. Select any video to play or shortlist into team folders.
                </p>
              </div>
            )}

            {/* Smart Adaptive Recommendations Feed */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{recommendationReason}</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400">Curated from: {recommendationTopic}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchRecommendations}
                  disabled={isLoadingRecommendations}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                  title="Refresh recommendations"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingRecommendations ? "animate-spin" : ""}`} />
                  <span className="text-[10px]">Refresh</span>
                </button>
              </div>

              {isLoadingRecommendations ? (
                <div className="py-8 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
                  <p className="text-[11px]">Generating adaptive recommendations...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No recommendations found. Try searching in the Explore tab.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {recommendations.map((v) => (
                    <div
                      key={v.id}
                      className="group flex gap-3 p-2 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/70 hover:border-zinc-700 transition-all"
                    >
                      {/* Video Thumbnail */}
                      <div
                        onClick={() => handlePlayVideo(v)}
                        className="relative w-28 aspect-video rounded-lg overflow-hidden bg-black shrink-0 cursor-pointer shadow-xs group-hover:scale-102 transition-transform"
                      >
                        <img
                          src={
                            v.thumbnailUrl ||
                            (v.id ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80")
                          }
                          alt={v.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-5 h-5 fill-white text-white drop-shadow" />
                        </div>
                      </div>

                      {/* Video Meta & Actions */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="space-y-0.5">
                          <h5
                            onClick={() => handlePlayVideo(v)}
                            className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug cursor-pointer hover:text-red-400 transition-colors"
                          >
                            {v.title}
                          </h5>
                          <p className="text-[10px] text-zinc-400 truncate">{v.channelTitle}</p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handlePlayVideo(v)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Play</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddToQueue(v, "default")}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Shortlist</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: EXPLORE (SEARCH & DISCOVER) ==================== */}
        {activeTab === "explore" && (
          <div className="space-y-3">
            {/* Live Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch(searchQuery)
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search YouTube (e.g. Saleonic, LangGraph, AI agents)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
                />
              </div>
              <RaisedButton
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSearching}
                className="!h-8 !px-3 !rounded-xl text-xs gap-1.5 shrink-0 cursor-pointer"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
              </RaisedButton>
            </form>

            {/* Search Results */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{searchResults.length > 0 ? `Results (${searchResults.length})` : "Enter a search query"}</span>
              </div>

              {isSearching ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
                  <p className="text-xs">Searching YouTube...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No videos found. Try a different search query or select a topic pill above.
                </div>
              ) : (
                searchResults.map((video) => (
                  <div
                    key={video.id}
                    className="group flex gap-3 p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                  >
                    <div
                      onClick={() => handlePlayVideo(video)}
                      className="relative w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0 cursor-pointer shadow-sm group-hover:scale-102 transition-transform"
                    >
                      <img
                        src={
                          video.thumbnailUrl ||
                          (video.id ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80")
                        }
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-6 h-6 fill-white text-white drop-shadow" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <h4
                          onClick={() => handlePlayVideo(video)}
                          className="text-xs font-semibold text-white line-clamp-2 leading-snug cursor-pointer hover:text-red-400 transition-colors"
                        >
                          {video.title}
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate">{video.channelTitle}</p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1.5">
                        <button
                          type="button"
                          onClick={() => handlePlayVideo(video)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddToQueue(video, "default")}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Shortlist</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: SHORTLIST & FOLDERS ==================== */}
        {activeTab === "shortlist" && (
          <div className="space-y-3">
            {/* Folders Toolbar */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Research Folders</span>
              </span>

              <div className="flex items-center gap-1.5">
                <RaisedButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="!h-7 !px-2.5 !rounded-lg text-[11px] gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>New Folder</span>
                </RaisedButton>

                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportShortlistToWorkspace}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Export shortlist to Markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Folder Selection Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setSelectedFolderId("all")}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedFolderId === "all"
                    ? "bg-zinc-800 text-white border border-zinc-700/80 shadow-xs"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>All ({queue.length})</span>
              </button>

              {folders.map((f) => {
                const count = queue.filter((v) => (v.folderId || "default") === f.id).length
                const isSelected = selectedFolderId === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-zinc-800 text-white border border-zinc-700/80 shadow-xs"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <span>{f.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                )
              })}
            </div>

            {/* Inline Folder Creation Card */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolder}
                className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Create Research Collection</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder Name (e.g. AI Agents Benchmarks)..."
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="Optional Description..."
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <RaisedButton
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="!h-7 !px-3 !rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </RaisedButton>
                  <RaisedButton
                    variant="primary"
                    size="sm"
                    type="submit"
                    className="!h-7 !px-3 !rounded-lg text-xs cursor-pointer"
                  >
                    Save Folder
                  </RaisedButton>
                </div>
              </form>
            )}

            {/* Folder Header & Direct Agent Assignment Action */}
            {selectedFolderId !== "all" && activeFolderObj && (
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{activeFolderObj.name}</h4>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {activeFolderObj.description || `${filteredQueue.length} shortlisted videos`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <RaisedButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleAssignFolderToCopilot(activeFolderObj)}
                    className="!h-7 !px-2.5 !rounded-lg text-xs gap-1.5 cursor-pointer"
                    title="Assign all videos in this folder to Copilot for automated comparative analysis"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Assign to Copilot</span>
                  </RaisedButton>

                  {activeFolderObj.id !== "default" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(activeFolderObj.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      title="Delete this folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Videos List */}
            {filteredQueue.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-zinc-500">
                <FolderOpen className="w-8 h-8 stroke-1 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-400">No videos in this folder</p>
                <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                  Search videos in the Explore tab or ask your Copilot: &quot;Research top AI agent frameworks on YouTube and shortlist the best 3 videos for our squad.&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredQueue.map((video, idx) => {
                  const currentFolder = folders.find((f) => f.id === (video.folderId || "default"))
                  return (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 hover:border-zinc-700 transition-all group"
                    >
                      <div
                        onClick={() => handlePlayVideo(video)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                      >
                        <span className="text-[10px] font-mono font-bold text-zinc-500 w-4 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <img
                          src={
                            video.thumbnailUrl ||
                            (video.id ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80")
                          }
                          alt={video.title}
                          className="w-12 h-8 rounded-lg object-cover shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"
                          }}
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-red-400 transition-colors">
                            {video.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-400 truncate">{video.channelTitle}</span>
                            {currentFolder && selectedFolderId === "all" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
                                {currentFolder.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Folder selector & Action buttons */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {folders.length > 1 && (
                          <select
                            value={video.folderId || "default"}
                            onChange={(e) => handleMoveVideoFolder(video.id, e.target.value)}
                            className="text-[10px] bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none"
                            title="Move to folder"
                          >
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePlayVideo(video)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Play Now"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromQueue(video.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Remove from shortlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: TIMELINE NOTES ==================== */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            {/* Add New Note Card */}
            <form onSubmit={handleAddNote} className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Attach Key Takeaway</span>
                </span>
                {currentVideo && <span className="text-[10px] text-zinc-400 truncate max-w-[180px]">{currentVideo.title}</span>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNoteTime}
                  onChange={(e) => setNewNoteTime(e.target.value)}
                  placeholder="01:30"
                  className="w-16 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-center text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Important takeaway or architecture insight..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {notes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportNotesToWorkspace}
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export to .md</span>
                  </button>
                )}
                <RaisedButton
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={!currentVideo}
                  className="!h-7 !px-3 !rounded-lg text-xs ml-auto cursor-pointer"
                >
                  Save Note
                </RaisedButton>
              </div>
            </form>

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-zinc-500">
                <BookOpen className="w-8 h-8 stroke-1 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-400">No notes recorded yet</p>
                <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                  Tag specific timestamps as you watch, or instruct Copilot: &quot;Take a note at 02:45 about state persistence.&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleSeekTo(note.timestampSeconds)}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white text-[11px] font-mono font-bold transition-colors cursor-pointer"
                        title="Seek to timestamp in player"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{note.timestampFormatted || "00:00"}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{note.author || "Note"}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed">{note.text}</p>
                    {note.videoTitle && (
                      <p className="text-[10px] text-zinc-500 truncate">{note.videoTitle}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Portal Video Player (Morphs smoothly between Home Dock Slot & Floating Resizable PiP Card) */}
      {isMounted &&
        currentVideo &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: isHomeViewActive ? `${homeRect.top}px` : `${pipPos.y}px`,
              left: isHomeViewActive ? `${homeRect.left}px` : `${pipPos.x}px`,
              width: isHomeViewActive ? `${homeRect.width}px` : `${pipWidth}px`,
              height: isHomeViewActive
                ? `${homeRect.height}px`
                : `${Math.round((pipWidth * 9) / 16)}px`,
              clipPath: isHomeViewActive
                ? `inset(${homeRect.clipTop}px 0px ${homeRect.clipBottom}px 0px round 12px)`
                : "inset(0px 0px 0px 0px round 16px)",
              transition:
                isInteractingPip || isScrollingHome || !homeRect.valid
                  ? "none"
                  : "top 380ms cubic-bezier(0.22, 1, 0.36, 1), left 380ms cubic-bezier(0.22, 1, 0.36, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1), height 380ms cubic-bezier(0.22, 1, 0.36, 1), clip-path 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease",
            }}
            className={`${isHomeViewActive ? "z-20" : "z-30"} ${
              isHomeViewActive
                ? homeRect.clipTop >= homeRect.height || homeRect.clipBottom >= homeRect.height
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100 pointer-events-auto"
                : isPipMode
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
            } ${
              !isHomeViewActive && isPipMode
                ? "rounded-2xl shadow-2xl ring-1 ring-white/15 bg-black"
                : "rounded-xl bg-black"
            }`}
          >
            <CustomVideoPlayer
              videoId={currentVideo.id}
              title={currentVideo.title}
              thumbnailUrl={currentVideo.thumbnailUrl}
              autoPlay={true}
              seekRequest={seekRequest}
              onPlayStateChange={handlePlayStateChange}
              controlRef={playerControlRef}
              isPipMode={!isHomeViewActive && isPipMode}
              onReturnToHome={handleReturnToHomeFromPip}
              onClosePip={handleClosePip}
              onPipDragMouseDown={handlePipDragMouseDown}
              didDragRef={didDragRef}
            />

            {/* Multi-Directional Resize Handles (Active in Floating PiP Mode) */}
            {!isHomeViewActive && isPipMode && (
              <>
                <div
                  onMouseDown={(e) => handlePipResizeMouseDown("nw", e)}
                  className="absolute -top-1.5 -left-1.5 w-4 h-4 z-40 cursor-nwse-resize"
                  title="Drag corner to resize PiP player"
                />
                <div
                  onMouseDown={(e) => handlePipResizeMouseDown("ne", e)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 z-40 cursor-nesw-resize"
                  title="Drag corner to resize PiP player"
                />
                <div
                  onMouseDown={(e) => handlePipResizeMouseDown("sw", e)}
                  className="absolute -bottom-1.5 -left-1.5 w-4 h-4 z-40 cursor-nesw-resize"
                  title="Drag corner to resize PiP player"
                />
                <div
                  onMouseDown={(e) => handlePipResizeMouseDown("se", e)}
                  className="absolute -bottom-1.5 -right-1.5 w-4 h-4 z-40 cursor-nwse-resize"
                  title="Drag corner to resize PiP player"
                />
                <div
                  onMouseDown={(e) => handlePipResizeMouseDown("w", e)}
                  className="absolute top-3 bottom-3 -left-1 w-2.5 z-30 cursor-ew-resize"
                />
                <div
                  onMouseDown={(e) => handlePipResizeMouseDown("e", e)}
                  className="absolute top-3 bottom-3 -right-1 w-2.5 z-30 cursor-ew-resize"
                />
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
