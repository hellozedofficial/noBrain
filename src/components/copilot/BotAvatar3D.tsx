"use client"

import React, { useEffect, useState } from "react"
import { RobotHead, RobotHeadShape, RobotHeadState } from "robot-heads"

export interface BotAvatarProps {
  shape?: RobotHeadShape
  color?: string
  trimColor?: string
  screenColor?: string
  status?: "idle" | "thinking" | "working" | "action_needed" | "speaking" | "searching" | "error" | "happy"
  size?: number
  interactive?: boolean
  className?: string
  antenna?: boolean
}

export function mapStatusToRobotState(status?: string): RobotHeadState {
  switch (status) {
    case "thinking":
      return "thinking"
    case "working":
      return "working"
    case "searching":
      return "searching"
    case "action_needed":
    case "error":
      return "error"
    case "speaking":
      return "speaking"
    case "happy":
      return "happy"
    case "idle":
    default:
      return "idle"
  }
}

export function BotAvatar3D({
  shape = "rectangle",
  color = "#2b49a3",
  trimColor = "#93a6c8",
  screenColor = "#e8f2ff",
  status = "idle",
  size = 40,
  interactive = true,
  className = "",
  antenna,
}: BotAvatarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const robotState = mapStatusToRobotState(status)
  const showAntenna = antenna !== undefined ? antenna : size >= 48

  if (!mounted) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <RobotHead
        shape={shape}
        state={robotState}
        size={size}
        color={color}
        trimColor={trimColor}
        screenColor={screenColor}
        interactive={interactive}
        antenna={showAntenna}
        floorShadow={size >= 64}
        speed={1}
      />
    </div>
  )
}

