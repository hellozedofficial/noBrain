"use client"

import React, { useState, useEffect, useRef } from "react"
import { X, Users, Check, Sparkles, Pin, Crown, UploadCloud, Save, Trash2, Camera } from "lucide-react"
import { CopilotBot, CopilotRoom } from "@/lib/copilot/types"
import { BotAvatar3D } from "./BotAvatar3D"
import { RaisedButton } from "@/components/ui/raised-button"
import { IosLoader } from "@/components/ui/ios-loader"
import { rareToast } from "@/components/ui/rare-toast"

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  initialRoom?: CopilotRoom | null
  availableBots: CopilotBot[]
  onSaveRoom: (data: {
    name: string
    topic: string
    avatar_url: string | null
    chief_bot_id: string | null
    is_pinned: boolean
    assigned_bot_ids: string[]
  }) => void
}

export function CreateRoomModal({
  isOpen,
  onClose,
  initialRoom = null,
  availableBots,
  onSaveRoom,
}: CreateRoomModalProps) {
  const [name, setName] = useState("")
  const [topic, setTopic] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [chiefBotId, setChiefBotId] = useState<string>("")
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([])
  const [isPinned, setIsPinned] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialRoom) {
      setName(initialRoom.name || "")
      setTopic(initialRoom.topic || "")
      setAvatarUrl(initialRoom.avatar_url || null)
      setSelectedBotIds(initialRoom.assigned_bot_ids || [])
      setChiefBotId(initialRoom.chief_bot_id || initialRoom.assigned_bot_ids?.[0] || "")
      setIsPinned(Boolean(initialRoom.is_pinned))
    } else {
      setName("")
      setTopic("")
      setAvatarUrl(null)
      const defaultIds = availableBots.slice(0, 3).map((b) => b.id)
      setSelectedBotIds(defaultIds)
      setChiefBotId(defaultIds[0] || "")
      setIsPinned(false)
    }
  }, [initialRoom, isOpen, availableBots])

  if (!isOpen) return null

  // 1:1 Center crop & 90% compression in Canvas before uploading to S3
  const cropAndCompress1to1 = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement("canvas")
        const targetDim = 512 // 512x512 standard high-DPI 1:1 avatar

        canvas.width = targetDim
        canvas.height = targetDim

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not initialize 2D canvas context"))
          return
        }

        // 1:1 Center Square Crop
        const naturalWidth = img.naturalWidth || img.width
        const naturalHeight = img.naturalHeight || img.height
        const minSide = Math.min(naturalWidth, naturalHeight)
        const sx = (naturalWidth - minSide) / 2
        const sy = (naturalHeight - minSide) / 2

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        // Draw center-cropped 1:1 square to 512x512 canvas
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetDim, targetDim)

        // 90% compression (0.1 quality achieves ~90% compression ratio, compressing multi-MB photos down to ~20-30KB)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Canvas compression failed"))
            }
          },
          "image/jpeg",
          0.1
        )
      }

      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }

      img.src = objectUrl
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      rareToast.error("Invalid File", "Please select an image file")
      return
    }

    setIsUploading(true)
    try {
      // 1. Auto 1:1 crop and 90% compression
      const compressedBlob = await cropAndCompress1to1(file)

      // 2. Upload to S3 via /api/upload
      const formData = new FormData()
      formData.append("file", compressedBlob, `room_avatar_${Date.now()}.jpg`)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setAvatarUrl(data.url)
        rareToast.success("Profile Pic Uploaded", "1:1 image compressed 90% & saved to S3")
      } else {
        const err = await res.json().catch(() => ({}))
        rareToast.error("Upload Failed", err.error || "Could not upload image")
      }
    } catch (err: any) {
      console.error("Room avatar upload error:", err)
      rareToast.error("Upload Error", err.message || "Failed to process image")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const toggleBotSelection = (botId: string) => {
    setSelectedBotIds((prev) => {
      const next = prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]
      // If chief was unassigned, pick new chief
      if (!next.includes(chiefBotId)) {
        setChiefBotId(next[0] || "")
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSaveRoom({
      name: name.trim(),
      topic: topic.trim() || "Collaborative multi-bot room",
      avatar_url: avatarUrl || null,
      chief_bot_id: chiefBotId || selectedBotIds[0] || null,
      is_pinned: isPinned,
      assigned_bot_ids: selectedBotIds,
    })
  }

  const assignedBotsList = availableBots.filter((b) => selectedBotIds.includes(b.id))

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]">
        {/* Fixed Header */}
        <div className="shrink-0 px-6 py-4.5 sm:px-7 sm:py-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {initialRoom ? "Edit Copilot Room" : "Create Copilot Room"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {initialRoom ? "Update squad configuration, chief agent, and profile picture" : "Assemble multiple copilots in a shared workspace"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="create-room-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-4 min-h-0">
            {/* Room Profile Picture Upload (1:1 Auto-Crop & 90% Compressed S3 Upload) */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/70 flex items-center justify-center shrink-0 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-all shadow-xs group"
                  title="Click to upload room profile picture"
                >
                  {avatarUrl ? (
                    <>
                      <img
                        src={avatarUrl}
                        alt="Room Profile"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                        Change
                      </div>
                    </>
                  ) : isUploading ? (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <IosLoader size="sm" color="#3b82f6" />
                      <span className="text-[9px] mt-1 text-zinc-400 font-mono">Compressing</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                      <Camera className="w-6 h-6 stroke-[1.8]" />
                      <span className="text-[9px] font-medium mt-1">1:1 Photo</span>
                    </div>
                  )}

                      {isUploading && avatarUrl && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                          <IosLoader size="sm" color="#ffffff" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                        Room Profile Picture
                      </label>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Auto 1:1 square crop.
                      </p>

                      <div className="flex items-center gap-2 mt-2.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <RaisedButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="!h-7 !px-2.5 text-xs gap-1"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{avatarUrl ? "Change Photo" : "Upload Photo"}</span>
                        </RaisedButton>

                        {avatarUrl && (
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => setAvatarUrl(null)}
                            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Room Title */}
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Room Title
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Architecture Sprint, Product Squad"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                  />
                </div>

                {/* Goal / Discussion Topic */}
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Goal / Discussion Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Build our next API specification and prototype together"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                  />
                </div>

                {/* Assign Copilots to this Room */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Assign Copilots to this Room
                    </label>
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      {selectedBotIds.length} of {availableBots.length} assigned
                    </span>
                  </div>

                  {availableBots.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      No copilots found. Create your bots first to add them to rooms.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                      {availableBots.map((bot) => {
                        const isAssigned = selectedBotIds.includes(bot.id)
                        return (
                          <button
                            key={bot.id}
                            type="button"
                            onClick={() => toggleBotSelection(bot.id)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left cursor-pointer ${isAssigned
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                                : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                              }`}
                          >
                            <BotAvatar3D
                              shape={bot.shape}
                              color={bot.color}
                              trimColor={bot.trim_color}
                              screenColor={bot.screen_color}
                              size={30}
                              antenna={false}
                              interactive={false}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs truncate">{bot.name}</div>
                              <div className="text-[10px] opacity-75 truncate">{bot.role}</div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isAssigned
                                  ? "border-current bg-transparent"
                                  : "border-zinc-400 dark:border-zinc-600"
                                }`}
                            >
                              {isAssigned && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Chief Agent (Lead Coordinator) Selection */}
                {assignedBotsList.length > 0 && (
                  <div className="p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>Chief Agent (Squad Leader)</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      The Chief Agent takes the lead in coordinating team discussion and delegating tasks.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {assignedBotsList.map((bot) => {
                        const isChief = chiefBotId === bot.id
                        return (
                          <button
                            key={bot.id}
                            type="button"
                            onClick={() => setChiefBotId(bot.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${isChief
                                ? "border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-zinc-100 font-semibold"
                                : "border-zinc-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                              }`}
                          >
                            <BotAvatar3D
                              shape={bot.shape}
                              color={bot.color}
                              trimColor={bot.trim_color}
                              screenColor={bot.screen_color}
                              size={24}
                              antenna={false}
                              interactive={false}
                            />
                            <span className="text-xs truncate flex-1">{bot.name}</span>
                            {isChief && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full bg-amber-500/20">
                                Chief
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </form>

      {/* Fixed Footer */}
      <div className="shrink-0 px-6 py-4 sm:px-7 sm:py-4.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between z-10">
        <RaisedButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          Cancel
        </RaisedButton>

        <div className="flex items-center gap-2.5">
          {/* Pin to Top Button (To the left of Save Changes) */}
          <RaisedButton
            type="button"
            variant={isPinned ? "primary" : "secondary"}
            size="sm"
            onClick={() => setIsPinned(!isPinned)}
            className={`gap-1.5 ${isPinned ? "!bg-amber-500 !text-black !border-amber-600" : ""}`}
            title={isPinned ? "Pinned to top" : "Pin this room to top of sidebar"}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
            <span>{isPinned ? "Pinned to Top" : "Pin to Top"}</span>
          </RaisedButton>

          <RaisedButton
            type="submit"
            form="create-room-form"
            variant="primary"
            size="sm"
            disabled={!name.trim() || isUploading}
            className="gap-1.5"
          >
            {initialRoom ? (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Room</span>
              </>
            )}
          </RaisedButton>
        </div>
      </div>
    </div>
  </div>
  )
}
