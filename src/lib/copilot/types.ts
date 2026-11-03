import { RobotHeadShape, RobotHeadState } from "robot-heads"

export interface CopilotBot {
  id: string
  user_id: string
  name: string
  username: string
  role: string
  shape: RobotHeadShape
  color: string
  trim_color: string
  screen_color: string
  status: "idle" | "thinking" | "working" | "action_needed"
  is_pinned?: boolean
  cleared_at?: string | null
  rules: Record<string, "allow" | "ask" | "block">
  memory: string
  open_items: Array<{ id: string; title: string; note?: string; status: "open" | "done" }>
  created_at: string
  updated_at: string
}

export interface CopilotRoom {
  id: string
  user_id: string
  name: string
  topic: string
  avatar_url?: string | null
  chief_bot_id?: string | null
  is_pinned?: boolean
  cleared_at?: string | null
  assigned_bot_ids: string[]
  created_at: string
  updated_at: string
}

export interface CopilotMessage {
  id: string
  user_id: string
  room_id?: string | null
  bot_id?: string | null
  sender_name: string
  role: "user" | "assistant" | "system"
  content: string
  image_url?: string | null
  reasoning?: string
  tool_calls?: any[]
  duration_seconds?: number | null
  created_at: string
}

export interface CopilotFile {
  id: string
  bot_id?: string | null
  room_id?: string | null
  user_id: string
  file_path: string
  content: string
  created_at: string
  updated_at: string
}

export const SHELL_COLORS = [
  { name: "Cobalt", hex: "#2b49a3" },
  { name: "Coral", hex: "#e0563f" },
  { name: "Emerald", hex: "#2f8f5b" },
  { name: "Violet", hex: "#6b46c1" },
  { name: "Teal", hex: "#1f8a99" },
  { name: "Amber", hex: "#d98a1c" },
  { name: "Ruby", hex: "#b8323a" },
  { name: "Graphite", hex: "#3d4452" },
  { name: "Indigo", hex: "#3f3fb0" },
  { name: "Lime", hex: "#6e9a1f" },
]

export const TRIM_COLORS = [
  { name: "Steel", hex: "#93a6c8" },
  { name: "Warm Silver", hex: "#d5d5d5" },
  { name: "Copper", hex: "#c47d52" },
  { name: "Gold", hex: "#e6b800" },
  { name: "Midnight", hex: "#1e293b" },
  { name: "Rose", hex: "#e2a9b3" },
]

export const SCREEN_COLORS = [
  { name: "Ice White", hex: "#e8f2ff" },
  { name: "Neon Cyan", hex: "#38bdf8" },
  { name: "Matrix Green", hex: "#4ade80" },
  { name: "Sunset Pink", hex: "#f472b6" },
  { name: "Warm Amber", hex: "#fbbf24" },
]

export const HEAD_SHAPES: { shape: RobotHeadShape; label: string }[] = [
  { shape: "rectangle", label: "Classic TV" },
  { shape: "circle", label: "Porthole" },
  { shape: "square", label: "Retro Box" },
  { shape: "hexagon", label: "Nut Hex" },
]

