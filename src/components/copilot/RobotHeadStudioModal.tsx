"use client"

import React, { useState, useEffect } from "react"
import { X, Sparkles, Check, RefreshCw, Save, Pin } from "lucide-react"
import { RobotHeadShape } from "robot-heads"
import { BotAvatar3D } from "./BotAvatar3D"
import {
  HEAD_SHAPES,
  SHELL_COLORS,
  TRIM_COLORS,
  SCREEN_COLORS,
  CopilotBot,
} from "@/lib/copilot/types"
import { RaisedButton } from "@/components/ui/raised-button"

interface StudioModalProps {
  isOpen: boolean
  onClose: () => void
  initialBot?: CopilotBot | null
  onSave: (bot: {
    name: string
    username: string
    role: string
    shape: RobotHeadShape
    color: string
    trim_color: string
    screen_color: string
    model?: string
    is_pinned?: boolean
  }) => void
}

export function RobotHeadStudioModal({ isOpen, onClose, initialBot = null, onSave }: StudioModalProps) {
  const [name, setName] = useState("Scout")
  const [username, setUsername] = useState("scout")
  const [role, setRole] = useState("Full-Stack Researcher & Coder")
  const [shape, setShape] = useState<RobotHeadShape>("rectangle")
  const [color, setColor] = useState("#2b49a3")
  const [trimColor, setTrimColor] = useState("#93a6c8")
  const [screenColor, setScreenColor] = useState("#e8f2ff")
  const [model, setModel] = useState("nobrain-1.5")
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; provider: string }>>([
    { id: "nobrain-1.5", name: "noBrain 1.5", provider: "builtin" },
  ])
  const [testState, setTestState] = useState<"idle" | "thinking" | "working" | "happy">("idle")
  const [userEditedUsername, setUserEditedUsername] = useState(false)
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models.map((m: any) => ({ id: m.id, name: m.name, provider: m.provider })))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (initialBot) {
      setName(initialBot.name || "")
      setUsername(initialBot.username || (initialBot.name ? initialBot.name.toLowerCase().replace(/[^a-z0-9_]/g, "") : "copilot"))
      setRole(initialBot.role || "")
      setShape(initialBot.shape || "rectangle")
      setColor(initialBot.color || "#2b49a3")
      setTrimColor(initialBot.trim_color || "#93a6c8")
      setScreenColor(initialBot.screen_color || "#e8f2ff")
      setModel(initialBot.model || "nobrain-1.5")
      setUserEditedUsername(true)
      setIsPinned(Boolean(initialBot.is_pinned))
    } else {
      setName("Scout")
      setUsername("scout")
      setRole("Full-Stack Researcher & Coder")
      setShape("rectangle")
      setColor("#2b49a3")
      setTrimColor("#93a6c8")
      setScreenColor("#e8f2ff")
      setModel("nobrain-1.5")
      setUserEditedUsername(false)
      setIsPinned(false)
    }
  }, [initialBot, isOpen])

  if (!isOpen) return null

  const handleNameChange = (val: string) => {
    setName(val)
    if (!userEditedUsername && !initialBot) {
      const generated = val.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/__+/g, "_")
      setUsername(generated)
    }
  }

  const handleRandomize = () => {
    const rShape = HEAD_SHAPES[Math.floor(Math.random() * HEAD_SHAPES.length)].shape
    const rColor = SHELL_COLORS[Math.floor(Math.random() * SHELL_COLORS.length)].hex
    const rTrim = TRIM_COLORS[Math.floor(Math.random() * TRIM_COLORS.length)].hex
    const rScreen = SCREEN_COLORS[Math.floor(Math.random() * SCREEN_COLORS.length)].hex

    setShape(rShape)
    setColor(rColor)
    setTrimColor(rTrim)
    setScreenColor(rScreen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const finalUsername = (username.trim() || name.toLowerCase().replace(/[^a-z0-9_]/g, "") || "copilot").toLowerCase()
    onSave({
      name: name.trim(),
      username: finalUsername,
      role: role.trim() || "AI Teammate",
      shape,
      color,
      trim_color: trimColor,
      screen_color: screenColor,
      model,
      is_pinned: isPinned,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Left Side: Live 3D Head Stage */}
        <div className="w-full md:w-5/12 bg-zinc-50 dark:bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-between p-6 relative">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Live Preview
            </span>
            <button
              type="button"
              onClick={handleRandomize}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Randomize Appearance"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Robot Head on Stage */}
          <div className="my-auto py-8 flex flex-col items-center">
            <BotAvatar3D
              shape={shape}
              color={color}
              trimColor={trimColor}
              screenColor={screenColor}
              status={testState}
              size={180}
              antenna={true}
              interactive={true}
            />
            <div className="mt-4 text-center">
              <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">{name || "Untitled"}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">{role || "Role"}</div>
            </div>
          </div>

          {/* Expression Quick Toggles */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 text-xs">
            {(["idle", "thinking", "working", "happy"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTestState(st)}
                className={`px-3 py-1 rounded-xl capitalize transition-all cursor-pointer ${
                  testState === st
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Customization Studio Form */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Fixed Header */}
          <div className="shrink-0 px-6 py-4.5 sm:px-8 sm:py-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {initialBot ? "Edit Copilot Bot" : "Create Copilot Bot"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {initialBot ? "Update bot details and customize 3D appearance" : "Configure role and custom 3D robot design"}
              </p>
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
          <form id="studio-bot-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 min-h-0">
            {/* Name, Handle & Role Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Copilot Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Scout"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Handle / Mention
                </label>
                <div className="flex items-center px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-sm">
                  <span className="text-zinc-400 font-mono text-xs mr-1">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUserEditedUsername(true)
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }}
                    placeholder="username"
                    className="w-full bg-transparent text-zinc-900 dark:text-zinc-100 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Specialization / Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Researcher & Coder"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                />
              </div>
            </div>

            {/* AI Engine & Intelligence Model */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                AI Engine / Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 cursor-pointer"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider === "builtin" ? "Native noBrain" : "OpenRouter"})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                The agent will reason, interact with workspace tools, and execute workflows using this model.
              </p>
            </div>

            {/* 1. Shape Picker */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                1. Head Outline Shape
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {HEAD_SHAPES.map((sh) => (
                  <button
                    key={sh.shape}
                    type="button"
                    onClick={() => setShape(sh.shape)}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      shape === sh.shape
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    <span className="text-xs font-bold capitalize">{sh.label}</span>
                    <span className="text-[10px] opacity-75">{sh.shape}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Shell Colors Palette */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  2. Shell Gloss Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                    title="Custom hex color"
                  />
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                    {color}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SHELL_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center shadow-sm cursor-pointer ${
                      color.toLowerCase() === c.hex.toLowerCase()
                        ? "scale-125 ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 ring-offset-background"
                        : "hover:scale-110"
                    }`}
                    title={c.name}
                  >
                    {color.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Trim Color (Ears & Collar) */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                3. Ears & Antenna Trim
              </label>
              <div className="flex flex-wrap gap-2">
                {TRIM_COLORS.map((tc) => (
                  <button
                    key={tc.hex}
                    type="button"
                    onClick={() => setTrimColor(tc.hex)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      trimColor.toLowerCase() === tc.hex.toLowerCase()
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tc.hex }} />
                    <span>{tc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Screen Color (LED Matrix Face) */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                4. Screen Face LEDs
              </label>
              <div className="flex flex-wrap gap-2">
                {SCREEN_COLORS.map((sc) => (
                  <button
                    key={sc.hex}
                    type="button"
                    onClick={() => setScreenColor(sc.hex)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      screenColor.toLowerCase() === sc.hex.toLowerCase()
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: sc.hex }} />
                    <span>{sc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Fixed Footer Submit Actions */}
          <div className="shrink-0 px-6 py-4 sm:px-8 sm:py-4.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between z-10">
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
                title={isPinned ? "Pinned to top" : "Pin to top of sidebar"}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
                <span>{isPinned ? "Pinned to Top" : "Pin to Top"}</span>
              </RaisedButton>

              <RaisedButton
                type="submit"
                form="studio-bot-form"
                variant="primary"
                size="sm"
                className="gap-1.5"
              >
                {initialBot ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Deploy Copilot</span>
                  </>
                )}
              </RaisedButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
