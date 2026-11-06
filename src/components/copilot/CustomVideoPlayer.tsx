"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Loader2,
  Gauge,
  PictureInPicture2,
  X,
  GripHorizontal,
} from "lucide-react"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

export interface CustomVideoPlayerHandle {
  play: () => void
  pause: () => void
  togglePlay: () => void
}

interface CustomVideoPlayerProps {
  videoId: string
  title?: string
  thumbnailUrl?: string
  autoPlay?: boolean
  seekRequest?: { seconds: number; ts: number } | null
  onTimeUpdate?: (seconds: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
  onEnded?: () => void
  controlRef?: React.MutableRefObject<CustomVideoPlayerHandle | null>
  isPipMode?: boolean
  onReturnToHome?: () => void
  onClosePip?: () => void
  onPipDragMouseDown?: (e: React.MouseEvent) => void
  didDragRef?: React.MutableRefObject<boolean>
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2]

function formatTime(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return "00:00"
  const totalSeconds = Math.floor(secs)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function CustomVideoPlayer({
  videoId,
  title,
  thumbnailUrl,
  autoPlay = true,
  seekRequest,
  onTimeUpdate,
  onPlayStateChange,
  onEnded,
  controlRef,
  isPipMode = false,
  onReturnToHome,
  onClosePip,
  onPipDragMouseDown,
  didDragRef,
}: CustomVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mountNodeRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(85)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isSeeking, setIsSeeking] = useState(false)

  // Auto-hide controls when playing and mouse is idle
  const triggerControlsVisibility = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
    }
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 2400)
  }, [isPlaying])

  const playVideo = useCallback(() => {
    if (!isReady || !playerRef.current) return
    try {
      playerRef.current.playVideo()
      setIsPlaying(true)
      setHasStarted(true)
      onPlayStateChange?.(true)
      triggerControlsVisibility()
    } catch {}
  }, [isReady, onPlayStateChange, triggerControlsVisibility])

  const pauseVideo = useCallback(() => {
    if (!isReady || !playerRef.current) return
    try {
      playerRef.current.pauseVideo()
      setIsPlaying(false)
      setShowControls(true)
      onPlayStateChange?.(false)
    } catch {}
  }, [isReady, onPlayStateChange])

  const togglePlay = useCallback(() => {
    if (didDragRef?.current) {
      didDragRef.current = false
      return
    }
    if (!isReady || !playerRef.current) return
    if (isPlaying) {
      pauseVideo()
    } else {
      playVideo()
    }
  }, [didDragRef, isReady, isPlaying, pauseVideo, playVideo])

  // Expose imperative handle
  useEffect(() => {
    if (controlRef) {
      controlRef.current = {
        play: playVideo,
        pause: pauseVideo,
        togglePlay,
      }
    }
  }, [controlRef, playVideo, pauseVideo, togglePlay])

  // Load YouTube IFrame API script once globally
  const ensureYTApi = useCallback((): Promise<any> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.YT && window.YT.Player) {
        resolve(window.YT)
        return
      }

      const existingScript = document.getElementById("nobrain-yt-iframe-api")
      if (!existingScript) {
        const tag = document.createElement("script")
        tag.id = "nobrain-yt-iframe-api"
        tag.src = "https://www.youtube.com/iframe_api"
        document.head.appendChild(tag)
      }

      const prevCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback()
        resolve(window.YT)
      }

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval)
          resolve(window.YT)
        }
      }, 100)
    })
  }, [])

  // Initialize or update player when videoId changes
  useEffect(() => {
    let isMounted = true
    setIsReady(false)
    setIsBuffering(true)
    setCurrentTime(0)
    setDuration(0)

    ensureYTApi().then((YT) => {
      if (!isMounted || !mountNodeRef.current) return

      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {}
        playerRef.current = null
      }

      mountNodeRef.current.innerHTML = ""
      const playerDiv = document.createElement("div")
      mountNodeRef.current.appendChild(playerDiv)

      playerRef.current = new YT.Player(playerDiv, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
          cc_load_policy: 0,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return
            setIsReady(true)
            setIsBuffering(false)
            try {
              const dur = event.target.getDuration() || 0
              setDuration(dur)
              event.target.setVolume(volume)
              if (autoPlay) {
                event.target.playVideo()
              }
            } catch {}
          },
          onStateChange: (event: any) => {
            if (!isMounted) return
            const state = event.data
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (state === 1) {
              setIsPlaying(true)
              setIsBuffering(false)
              setHasStarted(true)
              onPlayStateChange?.(true)
              try {
                const dur = event.target.getDuration()
                if (dur > 0) setDuration(dur)
              } catch {}
            } else if (state === 2) {
              setIsPlaying(false)
              setIsBuffering(false)
              onPlayStateChange?.(false)
            } else if (state === 3) {
              setIsBuffering(true)
            } else if (state === 0) {
              setIsPlaying(false)
              setIsBuffering(false)
              onPlayStateChange?.(false)
              onEnded?.()
            }
          },
        },
      })
    })

    return () => {
      isMounted = false
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {}
        playerRef.current = null
      }
    }
  }, [videoId, ensureYTApi])

  // Poll playback progress while playing
  useEffect(() => {
    if (!isReady || !isPlaying || isSeeking) return

    const interval = setInterval(() => {
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          const cur = playerRef.current.getCurrentTime() || 0
          const dur = playerRef.current.getDuration() || 0
          setCurrentTime(cur)
          if (dur > 0) setDuration(dur)
          onTimeUpdate?.(cur)
        }
      } catch {}
    }, 250)

    return () => clearInterval(interval)
  }, [isReady, isPlaying, isSeeking, onTimeUpdate])

  // Handle external seek requests (e.g. clicking a timestamp note)
  useEffect(() => {
    if (!seekRequest || !isReady || !playerRef.current) return
    try {
      playerRef.current.seekTo(seekRequest.seconds, true)
      playerRef.current.playVideo()
      setCurrentTime(seekRequest.seconds)
      setIsPlaying(true)
      onPlayStateChange?.(true)
    } catch {}
  }, [seekRequest, isReady, onPlayStateChange])

  // Track fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      try {
        playerRef.current.seekTo(newTime, true)
      } catch {}
    }
  }

  const handleSkip = (deltaSeconds: number) => {
    if (!playerRef.current || !isReady) return
    try {
      const next = Math.max(0, Math.min(duration || 0, currentTime + deltaSeconds))
      playerRef.current.seekTo(next, true)
      setCurrentTime(next)
      triggerControlsVisibility()
    } catch {}
  }

  const toggleMute = () => {
    if (!playerRef.current || !isReady) return
    try {
      if (isMuted) {
        playerRef.current.unMute()
        playerRef.current.setVolume(volume || 80)
        setIsMuted(false)
      } else {
        playerRef.current.mute()
        setIsMuted(true)
      }
    } catch {}
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    setVolume(val)
    if (!playerRef.current || !isReady) return
    try {
      playerRef.current.setVolume(val)
      if (val === 0) {
        playerRef.current.mute()
        setIsMuted(true)
      } else if (isMuted) {
        playerRef.current.unMute()
        setIsMuted(false)
      }
    } catch {}
  }

  const cyclePlaybackRate = () => {
    if (!playerRef.current || !isReady) return
    const nextIdx = (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length
    const nextRate = PLAYBACK_RATES[nextIdx]
    setPlaybackRate(nextRate)
    try {
      playerRef.current.setPlaybackRate(nextRate)
    } catch {}
  }

  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return
    try {
      if (!document.fullscreenElement) {
        await wrapperRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {}
  }

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const posterUrl =
    thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined)

  return (
    <div
      ref={wrapperRef}
      onMouseMove={triggerControlsVisibility}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full h-full overflow-hidden bg-black select-none group"
    >
      {/* Overscan Iframe Container: pushes YouTube top title bar and bottom branding outside the overflow-hidden frame */}
      <div className="absolute -top-[100%] left-0 w-full h-[300%] pointer-events-none select-none">
        <div ref={mountNodeRef} className="w-full h-full" />
      </div>

      {/* Custom Poster / Pause Mask (Centered Play Button + Hides YouTube's pause recommendations) */}
      {(!hasStarted || !isPlaying) && (
        <div
          onMouseDown={isPipMode ? onPipDragMouseDown : undefined}
          onClick={togglePlay}
          className={`absolute inset-0 z-10 bg-black flex items-center justify-center transition-opacity duration-200 ${
            isPipMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
          }`}
        >
          {posterUrl && (
            <img
              src={posterUrl}
              alt={title || "Video"}
              className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = "none"
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/45 pointer-events-none" />
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            className="relative z-20 w-12 h-12 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          >
            {isBuffering ? (
              <Loader2 className="w-5 h-5 animate-spin text-zinc-200" />
            ) : (
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Invisible Click & Drag Shield over active video */}
      <div
        onMouseDown={isPipMode ? onPipDragMouseDown : undefined}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className={`absolute inset-0 z-10 ${
          isPipMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        }`}
      />

      {/* Floating PiP Top Drag & Action Bar (Visible in PiP mode) */}
      {isPipMode && (
        <div
          onMouseDown={onPipDragMouseDown}
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-x-0 top-0 z-30 px-2.5 py-1.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-opacity duration-200 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 pointer-events-none">
            <GripHorizontal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-100 truncate">
              {title || "Playing Video"}
            </span>
          </div>

          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 shrink-0"
          >
            {onReturnToHome && (
              <button
                type="button"
                onClick={onReturnToHome}
                className="p-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                title="Return to Home Player"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onClosePip && (
              <button
                type="button"
                onClick={() => {
                  pauseVideo()
                  onClosePip()
                }}
                className="p-1 rounded-lg bg-zinc-900/80 hover:bg-red-600/80 border border-zinc-700/70 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                title="Close Mini Player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Buffering Spinner when playing */}
      {isBuffering && hasStarted && isPlaying && (
        <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center bg-black/20">
          <div className="w-10 h-10 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        </div>
      )}

      {/* Custom Bottom Control Bar */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 z-20 px-2.5 pt-5 pb-2 bg-gradient-to-t from-black/95 via-black/75 to-transparent transition-opacity duration-200 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Interactive Scrubber Bar */}
        <div className="relative flex items-center w-full h-3 mb-1 group/scrub cursor-pointer">
          <div className="w-full h-1 group-hover/scrub:h-1.5 bg-zinc-700/80 rounded-full overflow-hidden transition-all">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-1.5 text-zinc-200">
          <div className="flex items-center gap-1 min-w-0">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer shrink-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => handleSkip(-10)}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Rewind 10s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => handleSkip(10)}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Forward 10s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Volume */}
            {!isPipMode && (
              <div className="flex items-center gap-1 group/vol shrink-0">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-12 h-1 accent-blue-500 bg-zinc-700 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Timecode */}
            <div className="text-[10px] font-mono text-zinc-300 pl-1 select-none truncate">
              <span>{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-0.5">/</span>
              <span className="text-zinc-400">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Playback Speed */}
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className="px-1.5 py-0.5 rounded-md hover:bg-white/10 text-[10px] font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
              title="Playback Speed"
            >
              <Gauge className="w-3 h-3" />
              <span>{playbackRate}x</span>
            </button>

            {/* Return to Home button in bottom bar too when in PiP */}
            {isPipMode && onReturnToHome && (
              <button
                type="button"
                onClick={onReturnToHome}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Expand back to Home"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
