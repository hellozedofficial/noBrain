"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Mail,
  Loader2,
  AlertCircle,
  Unplug,
} from "lucide-react"
import { RaisedButton } from "@/components/ui/raised-button"

export interface IntegrationItem {
  id: string
  name: string
  serviceId: "gmail" | "drive" | "github" | "notion" | "slack" | "facebook" | "instagram" | "calendar"
  category: string
  description: string
  status: "active" | "coming_soon"
  icon: React.ReactNode
}

interface CopilotIntegrationRecord {
  id: string
  provider: string
  account_email: string | null
  status: "connected" | "disconnected"
  updated_at?: string
}

interface IntegrationsModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
  onIntegrationsChanged?: () => void
}

// Crisp official vector SVGs for all 8 integrations
function GmailIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M2 6.5C2 5.12 3.12 4 4.5 4H7.2V11.2L2 7.7V6.5Z"
        fill="#EA4335"
      />
      <path
        d="M22 6.5C22 5.12 20.88 4 19.5 4H16.8V11.2L22 7.7V6.5Z"
        fill="#EA4335"
      />
      <path
        d="M16.8 11.2V20H19.5C20.88 20 22 18.88 22 17.5V7.7L16.8 11.2Z"
        fill="#4285F4"
      />
      <path
        d="M7.2 11.2V20H4.5C3.12 20 2 18.88 2 17.5V7.7L7.2 11.2Z"
        fill="#34A853"
      />
      <path
        d="M7.2 4H16.8V11.2L12 14.5L7.2 11.2V4Z"
        fill="#FBBC04"
      />
      <path
        d="M16.8 11.2L12 14.5L7.2 11.2V4L12 7.4L16.8 4V11.2Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function DriveIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M8.2 3.5L1.5 15.1L5.1 21.3L11.8 9.7L8.2 3.5Z"
        fill="#0066DA"
      />
      <path
        d="M15.8 3.5H8.2L11.8 9.7H22.5L19.2 3.5H15.8Z"
        fill="#00AC47"
      />
      <path
        d="M11.8 9.7L5.1 21.3H18.9L22.5 15.1L11.8 9.7Z"
        fill="#FFBA00"
      />
    </svg>
  )
}

function GitHubIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

function NotionIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.458-.7c.374 0 .467-.187.374-.467L17.79 2.25c-.28-.374-.747-.56-1.307-.56L3.992 2.81c-.56 0-.746.28-.466.653l.933.745zm-.466 2.799v13.626c0 .746.373 1.026 1.213.933l13.626-.84c.84-.093 1.026-.653 1.026-1.213V5.888c0-.653-.28-.933-.933-.84l-13.906.84c-.746.093-1.026.467-1.026 1.12zm12.506 2.146c.093.467 0 .933-.467.933-.28 0-.56-.187-.84-.374l-2.053-1.68v9.053c0 .56-.28.84-.84.84h-.56c-.56 0-.84-.28-.84-.84V8.406L8.43 17.552c-.187.373-.467.466-.84.466h-.56c-.56 0-.747-.28-.747-.746V8.126c0-.56.28-.84.747-.84h.56c.56 0 .747.28.747.84v6.813l2.8-6.906c.187-.374.467-.467.84-.467h.56c.56 0 .747.28.84.747l2.893 2.146z" />
    </svg>
  )
}

function SlackIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        fill="#2EB67D"
      />
      <path
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill="#ECB22E"
      />
    </svg>
  )
}

function FacebookIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M16.5 12H13.5V21H10V12H8.5V9H10V7.2C10 5.4 11 4 13.5 4H16V7H14.5C13.8 7 13.5 7.4 13.5 8V9H16.5L16.5 12Z"
        fill="white"
      />
    </svg>
  )
}

function InstagramIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FED373" />
          <stop offset="0.25" stopColor="#F15245" />
          <stop offset="0.5" stopColor="#D92E7F" />
          <stop offset="0.75" stopColor="#9B36B7" />
          <stop offset="1" stopColor="#515ECF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <path
        d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 15.2C10.23 15.2 8.8 13.77 8.8 12C8.8 10.23 10.23 8.8 12 8.8C13.77 8.8 15.2 10.23 15.2 12C15.2 13.77 13.77 15.2 12 15.2ZM17.2 7.8C17.2 8.35 16.75 8.8 16.2 8.8C15.65 8.8 15.2 8.35 15.2 7.8C15.2 7.25 15.65 6.8 16.2 6.8C16.75 6.8 17.2 7.25 17.2 7.8ZM19.8 8.8C19.7 7.2 18.6 6.1 17 6C15.8 5.9 8.2 5.9 7 6C5.4 6.1 4.3 7.2 4.2 8.8C4.1 10 4.1 14 4.2 15.2C4.3 16.8 5.4 17.9 7 18C8.2 18.1 15.8 18.1 17 18C18.6 17.9 19.7 16.8 19.8 15.2C19.9 14 19.9 10 19.8 8.8Z"
        fill="white"
      />
    </svg>
  )
}

function CalendarIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M18.5 4H5.5C4.12 4 3 5.12 3 6.5V19.5C3 20.88 4.12 22 5.5 22H18.5C19.88 22 21 20.88 21 19.5V6.5C21 5.12 19.88 4 18.5 4Z" fill="#4285F4" />
      <path d="M3 6.5C3 5.12 4.12 4 5.5 4H18.5C19.88 4 21 5.12 21 6.5V9H3V6.5Z" fill="#1967D2" />
      <text x="12" y="18" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">31</text>
    </svg>
  )
}

export function IntegrationsModal({
  isOpen,
  onClose,
  userEmail = "",
  onIntegrationsChanged,
}: IntegrationsModalProps) {
  const [integrations, setIntegrations] = useState<CopilotIntegrationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [connectingService, setConnectingService] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch current integrations
  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/copilot/integrations")
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations || [])
      }
    } catch (err) {
      console.error("Failed to load integrations", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations()
      // Detect if user just returned from Google OAuth
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        if (params.get("integration") === "gmail_connected") {
          fetchIntegrations()
          onIntegrationsChanged?.()
          // Clean query parameter without page reload
          const cleanUrl = window.location.pathname
          window.history.replaceState({}, "", cleanUrl)
        }
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const isConnected = (serviceId: string) => {
    return integrations.some(
      (item) => item.provider === serviceId && item.status === "connected"
    )
  }

  const getConnectedAccount = (serviceId: string) => {
    const item = integrations.find(
      (i) => i.provider === serviceId && i.status === "connected"
    )
    return item?.account_email || null
  }

  // Handle Connect with Google OAuth 2.0
  const handleConnectGoogleOAuth = (service = "gmail") => {
    setConnectingService(service)
    setErrorMsg(null)
    const returnTo = window.location.pathname + window.location.search
    window.location.href = `/api/auth/google?service=${service}&returnTo=${encodeURIComponent(returnTo)}`
  }

  // Handle Disconnect
  const handleDisconnect = async (provider: string) => {
    try {
      setConnectingService(provider)
      setErrorMsg(null)
      const res = await fetch(`/api/copilot/integrations?provider=${provider}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to disconnect")
      }
      await fetchIntegrations()
      onIntegrationsChanged?.()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to disconnect")
    } finally {
      setConnectingService(null)
    }
  }

  // 8 Services
  const services: IntegrationItem[] = [
    {
      id: "gmail",
      name: "Gmail",
      serviceId: "gmail",
      category: "Email & Communication",
      description: "Send automated emails, notifications, and client updates via agent tools.",
      status: "active",
      icon: <GmailIcon />,
    },
    {
      id: "drive",
      name: "Google Drive",
      serviceId: "drive",
      category: "Cloud Storage & Docs",
      description: "Search files, read docs & sheets, export workspace plans, and share links.",
      status: "active",
      icon: <DriveIcon />,
    },
    {
      id: "github",
      name: "GitHub",
      serviceId: "github",
      category: "Developer Tools",
      description: "Commit code, review pull requests, and track issues across repos.",
      status: "coming_soon",
      icon: <GitHubIcon />,
    },
    {
      id: "notion",
      name: "Notion",
      serviceId: "notion",
      category: "Knowledge Base",
      description: "Export project plans, sprint boards, and notes into Notion pages.",
      status: "coming_soon",
      icon: <NotionIcon />,
    },
    {
      id: "slack",
      name: "Slack",
      serviceId: "slack",
      category: "Team Messaging",
      description: "Bridge room discussions and broadcast bot milestones to team channels.",
      status: "coming_soon",
      icon: <SlackIcon />,
    },
    {
      id: "facebook",
      name: "Facebook",
      serviceId: "facebook",
      category: "Social Media",
      description: "Manage page broadcasts, schedule posts, and query campaign reach.",
      status: "coming_soon",
      icon: <FacebookIcon />,
    },
    {
      id: "instagram",
      name: "Instagram",
      serviceId: "instagram",
      category: "Media & Creator",
      description: "Publish visual stories, manage feeds, and monitor engagement metrics.",
      status: "coming_soon",
      icon: <InstagramIcon />,
    },
    {
      id: "calendar",
      name: "Google Calendar",
      serviceId: "calendar",
      category: "Scheduling & Agendas",
      description: "Schedule squad meetings, lock sprint deadlines, and dispatch invites.",
      status: "coming_soon",
      icon: <CalendarIcon />,
    },
  ]

  const connectedCount = integrations.filter((i) => i.status === "connected").length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container: Fixed Header + Scrollable Content + Fixed Footer */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* FIXED HEADER */}
        <div className="shrink-0 px-6 py-4.5 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shadow-inner text-zinc-200">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Workspace Integrations
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                  {services.length} Apps
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Connect external accounts so your Copilot bots can trigger real-world actions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 4 COLUMN GRID OF INTEGRATIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service) => {
              const active = isConnected(service.serviceId)
              const account = getConnectedAccount(service.serviceId)
              const isGmail = service.serviceId === "gmail"

              return (
                <div
                  key={service.id}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                    active
                      ? "bg-zinc-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20"
                      : "bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  {/* Top Bar: Icon + Status Pill */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 p-2 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {service.icon}
                      </div>

                      {/* Status Badges */}
                      {active ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold tracking-wide shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Connected</span>
                        </div>
                      ) : service.status === "coming_soon" ? (
                        <div className="px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/60 text-zinc-400 text-[10px] font-medium tracking-wide">
                          Coming Soon
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 text-[10px] font-medium">
                          Available
                        </div>
                      )}
                    </div>

                    {/* Service Name & Category */}
                    <div className="mb-2">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                        {service.name}
                      </h3>
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                        {service.category}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                      {service.description}
                    </p>
                  </div>

                  {/* Bottom Action Area */}
                  <div className="pt-3 border-t border-zinc-800/60 mt-auto">
                    {service.serviceId === "gmail" || service.serviceId === "drive" ? (
                      active ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              G
                            </div>
                            <div className="text-[11px] text-zinc-300 font-mono truncate min-w-0">
                              {account}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={connectingService === service.serviceId}
                            onClick={() => handleDisconnect(service.serviceId)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                          >
                            {connectingService === service.serviceId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Unplug className="w-3.5 h-3.5" />
                            )}
                            <span>Disconnect {service.name}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={connectingService === service.serviceId}
                          onClick={() => handleConnectGoogleOAuth(service.serviceId)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-900 font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {connectingService === service.serviceId ? (
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                          ) : (
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                              <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                              />
                              <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                              />
                              <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                fill="#FBBC05"
                              />
                              <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                fill="#EA4335"
                              />
                            </svg>
                          )}
                          <span>Sign in with Google</span>
                        </button>
                      )
                    ) : (
                      <div className="w-full py-1.5 px-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 text-center text-[11px] font-medium flex items-center justify-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>In Development</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="text-xs text-zinc-400 leading-relaxed">
              <span className="font-semibold text-zinc-200">How Agent Email Works: </span>
              When your Gmail integration is connected, all your squad copilots gain access to the secure{" "}
              <code className="text-zinc-200 font-mono px-1 py-0.5 rounded bg-zinc-800">send_email</code> tool.
              Agents can send project updates, client reports, or notifications on your behalf.
            </div>
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="shrink-0 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span
              className={`w-2 h-2 rounded-full ${
                connectedCount > 0 ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-zinc-600"
              }`}
            />
            <span>
              {connectedCount === 0
                ? "No integrations active"
                : `${connectedCount} active integration${connectedCount > 1 ? "s" : ""}`}
            </span>
          </div>

          <RaisedButton
            variant="primary"
            size="sm"
            onClick={onClose}
            className="px-5 py-2 !rounded-2xl"
          >
            Done
          </RaisedButton>
        </div>
      </div>
    </div>
  )
}
