export interface ShortlistFolder {
  id: string
  name: string
  color?: string
  description?: string
  createdAt: string
  updatedAt?: string
}

export interface YouTubePlaylistItem {
  id: string
  title: string
  channelTitle?: string
  channelId?: string
  thumbnailUrl?: string
  views?: number
  likes?: number
  duration?: string
  publishedAt?: string
  addedAt?: string
  folderId?: string
}

export interface YouTubePlayerNote {
  id: string
  videoId: string
  videoTitle?: string
  timestampSeconds?: number
  timestampFormatted?: string
  text: string
  author?: string
  createdAt: string
}

export interface YouTubePlayerState {
  currentVideo: YouTubePlaylistItem | null
  queue: YouTubePlaylistItem[]
  folders: ShortlistFolder[]
  history: YouTubePlaylistItem[]
  notes: YouTubePlayerNote[]
  isPlaying: boolean
}

export const DEFAULT_FOLDERS: ShortlistFolder[] = [
  {
    id: "default",
    name: "General Shortlist",
    color: "#6366f1",
    description: "Default workspace video research collection",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ai_frameworks",
    name: "AI Agents & Architectures",
    color: "#ec4899",
    description: "Multi-agent frameworks, benchmarks, and LLM systems",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
]

export const DEFAULT_DISCOVERY_TOPICS = [
  "Top AI Agent Frameworks 2026",
  "LangGraph vs CrewAI vs AutoGen",
  "Autonomous Business Automation",
  "Next.js 16 App Router Full Course",
  "Building AI SaaS from Scratch",
  "Modern Multi-Agent Orchestration",
]

