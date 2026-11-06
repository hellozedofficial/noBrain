"use client"

import React, { useState, useEffect } from "react"
import { Play, Pause, Maximize2, X, Music, Volume2 } from "lucide-react"

interface MiniPlayerProps {
  isVisible: boolean
  onExpand: () => void
}

export function YouTubeMiniPlayer({ isVisible, onExpand }: MiniPlayerProps) {
  const [video, setVideo] = useState<{ id: string; title: string; thumbnailUrl?: string } | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  const fetchState = async () => {
    try {
      const res = await fetch("/api/copilot/youtube/player")
      if (res.ok) {
        const d = await res.json()
        if (d.currentVideo) {
          setVideo(d.currentVideo)
        }
      }
    } catch {}
  }

  useEffect(() => {
    fetchState()
    const handleEvent = (e: any) => {
      if (e.detail?.video) {
        setVideo(e.detail.video)
        setIsDismissed(false)
      }
    }
    window.addEventListener("nobrain:youtube_player", handleEvent)
    return () => window.removeEventListener("nobrain:youtube_player", handleEvent)
  }, [])

  if (!isVisible || !video || isDismissed) return null

  return (
    <div className="fixed bottom-5 right-5 z-40 w-72 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl p-2.5 flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom-4 duration-200 text-zinc-100">
      <div
        onClick={onExpand}
        className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
      >
        <div className="relative w-12 h-8 rounded-lg overflow-hidden bg-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <img
            src={video.thumbnailUrl || (video.id ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80")}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"
            }}
          />
          <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
            <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider font-mono">YouTube</span>
          </div>
          <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-red-400 transition-colors">
            {video.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onExpand}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Expand YouTube Studio tab"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Hide mini player"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
