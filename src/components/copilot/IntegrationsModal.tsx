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
  Settings2,
  Send,
  Copy,
  Plus,
  Trash2,
  KeyRound,
  Webhook,
  Bot,
} from "lucide-react"
import { RaisedButton } from "@/components/ui/raised-button"

export interface IntegrationItem {
  id: string
  name: string
  serviceId: "gmail" | "drive" | "github" | "notion" | "slack" | "facebook" | "instagram" | "calendar" | "meet" | "classroom" | "youtube" | "telegram"
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

// Crisp official vector SVGs for all integrations (monochrome: black in light mode, white in dark mode)
function GmailIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Gmail</title>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  )
}

function DriveIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Google Drive</title>
      <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" />
    </svg>
  )
}

function CalendarIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Google Calendar</title>
      <path d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z" />
    </svg>
  )
}

function MeetIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Google Meet</title>
      <path d="M5.53 2.13 0 7.75h5.53zm.398 0v5.62h7.608v3.65l5.47-4.45c-.014-1.22.031-2.25-.025-3.46-.148-1.09-1.287-1.47-2.236-1.36zM23.1 4.32c-.802.295-1.358.995-2.047 1.49-2.506 2.05-4.982 4.12-7.468 6.19 3.025 2.59 6.04 5.18 9.065 7.76 1.218.671 1.428-.814 1.328-1.64v-13a.828.828 0 0 0-.877-.825zM.038 8.15v7.7h5.53v-7.7zm13.577 8.1H6.008v5.62c3.864-.006 7.737.011 11.58-.009 1.02-.07 1.618-1.12 1.468-2.07v-2.51l-5.47-4.68v3.65zm-13.577 0c.02 1.44-.041 2.88.033 4.31.162.948 1.158 1.43 2.047 1.31h3.464v-5.62z" />
    </svg>
  )
}

function ClassroomIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Google Classroom</title>
      <path d="M1.6367 1.6367C.7322 1.6367 0 2.369 0 3.2734v17.4532c0 .9045.7322 1.6367 1.6367 1.6367h20.7266c.9045 0 1.6367-.7322 1.6367-1.6367V3.2734c0-.9045-.7322-1.6367-1.6367-1.6367H1.6367zm.545 2.1817h19.6367v16.3632h-2.7266v-1.0898h-4.9102v1.0898h-12V3.8184zM12 8.1816c-.9046 0-1.6367.7322-1.6367 1.6368 0 .9045.7321 1.6367 1.6367 1.6367.9046 0 1.6367-.7322 1.6367-1.6367 0-.9046-.7321-1.6368-1.6367-1.6368zm-4.3633 1.9102c-.6773 0-1.2285.5493-1.2285 1.2266 0 .6772.5512 1.2265 1.2285 1.2265.6773 0 1.2266-.5493 1.2266-1.2265 0-.6773-.5493-1.2266-1.2266-1.2266zm8.7266 0c-.6773 0-1.2266.5493-1.2266 1.2266 0 .6772.5493 1.2265 1.2266 1.2265.6773 0 1.2285-.5493 1.2285-1.2265 0-.6773-.5512-1.2266-1.2285-1.2266zM12 12.5449c-1.179 0-2.4128.4012-3.1484 1.0059-.384-.1198-.8043-.1875-1.2149-.1875-1.3136 0-2.7285.695-2.7285 1.5586v.8965h14.1836v-.8965c0-.8637-1.4149-1.5586-2.7285-1.5586-.4106 0-.831.0677-1.2149.1875-.7356-.6047-1.9694-1.0059-3.1484-1.0059Z" />
    </svg>
  )
}

function YouTubeIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>YouTube</title>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function GitHubIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>GitHub</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

function NotionIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor"><title>Notion</title><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>
  )
}

function SlackIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Slack</title>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}

function FacebookIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Facebook</title>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function InstagramIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Instagram</title>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function TelegramIcon({ className = "w-5 h-5 text-black dark:text-white" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      <title>Telegram</title>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
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
  const [statusToast, setStatusToast] = useState<string | null>(null)

  // Telegram Copilot Bridge State
  const [showTelegramConfig, setShowTelegramConfig] = useState(false)
  const [telegramBotToken, setTelegramBotToken] = useState("")
  const [telegramRestrictedAccess, setTelegramRestrictedAccess] = useState(true)
  const [telegramAllowedUsernames, setTelegramAllowedUsernames] = useState("")
  const [telegramAllowedChatIds, setTelegramAllowedChatIds] = useState("")
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(null)
  const [telegramBotFirstName, setTelegramBotFirstName] = useState<string | null>(null)
  const [telegramRoomName, setTelegramRoomName] = useState<string | null>("Telegram Bridge")
  const [telegramCopilots, setTelegramCopilots] = useState<any[]>([])
  const [telegramCopilotCount, setTelegramCopilotCount] = useState<number>(0)
  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState<string | null>(null)
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testChatId, setTestChatId] = useState("")
  const [copiedWebhook, setCopiedWebhook] = useState(false)

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

  const fetchTelegramConfig = async () => {
    try {
      const res = await fetch("/api/copilot/telegram")
      if (res.ok) {
        const data = await res.json()
        setTelegramBotUsername(data.botUsername || null)
        setTelegramBotFirstName(data.botFirstName || null)
        setTelegramRestrictedAccess(data.restrictedAccess ?? true)
        if (Array.isArray(data.allowedUsernames)) {
          setTelegramAllowedUsernames(data.allowedUsernames.map((u: string) => `@${u}`).join(", "))
        }
        if (Array.isArray(data.allowedChatIds)) {
          setTelegramAllowedChatIds(data.allowedChatIds.join(", "))
        }
        setTelegramRoomName(data.telegramRoomName || "Telegram Bridge")
        setTelegramCopilots(Array.isArray(data.copilots) ? data.copilots : [])
        setTelegramCopilotCount(Number(data.copilotCount) || 0)
        setTelegramWebhookUrl(data.webhookUrl || null)
      }
    } catch (e) {
      console.error("Failed to load Telegram config", e)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations()
      fetchTelegramConfig()
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        const integrationParam = params.get("integration")
        if (integrationParam && integrationParam.endsWith("_connected")) {
          fetchIntegrations()
          fetchTelegramConfig()
          onIntegrationsChanged?.()
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

  // Connect or Save Telegram Bot
  const handleSaveTelegram = async () => {
    try {
      setSavingTelegram(true)
      setErrorMsg(null)
      setStatusToast(null)

      if (telegramCopilotCount === 0) {
        throw new Error(
          "You must create at least 1 Copilot (e.g. CEO, CTO, Scout) on noBrain before connecting Telegram. Please create a Copilot first."
        )
      }

      if (!telegramBotToken.trim() && !telegramBotUsername) {
        throw new Error("Please enter your Telegram Bot Token from @BotFather.")
      }

      const usernamesList = telegramAllowedUsernames
        .split(/[,\s]+/)
        .map((u) => u.replace(/^@/, "").trim().toLowerCase())
        .filter(Boolean)

      const chatIdsList = telegramAllowedChatIds
        .split(/[,\s]+/)
        .map((c) => c.trim())
        .filter(Boolean)

      const res = await fetch("/api/copilot/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          botToken: telegramBotToken.trim(),
          restrictedAccess: telegramRestrictedAccess,
          allowedUsernames: usernamesList,
          allowedChatIds: chatIdsList,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect Telegram Bot")
      }

      setTelegramBotToken("")
      setStatusToast(
        `Telegram Bot @${data.botUsername} connected! Dedicated room "${data.telegramRoomName}" is active with all copilots.`
      )
      await fetchIntegrations()
      await fetchTelegramConfig()
      onIntegrationsChanged?.()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save Telegram settings")
    } finally {
      setSavingTelegram(false)
    }
  }

  // Test Telegram message
  const handleTestTelegram = async () => {
    try {
      setTestingTelegram(true)
      setErrorMsg(null)
      setStatusToast(null)

      const res = await fetch("/api/copilot/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_message",
          chatId: testChatId.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to send test message")
      }

      setStatusToast("Test greeting dispatched to your Telegram chat!")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send test message")
    } finally {
      setTestingTelegram(false)
    }
  }

  // Handle Disconnect Telegram
  const handleDisconnectTelegram = async () => {
    try {
      setConnectingService("telegram")
      setErrorMsg(null)
      const res = await fetch("/api/copilot/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to disconnect Telegram")
      }
      setShowTelegramConfig(false)
      setStatusToast("Telegram Bot disconnected.")
      await fetchIntegrations()
      await fetchTelegramConfig()
      onIntegrationsChanged?.()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to disconnect Telegram")
    } finally {
      setConnectingService(null)
    }
  }

  // Handle Generic Disconnect
  const handleDisconnect = async (provider: string) => {
    if (provider === "telegram") {
      return handleDisconnectTelegram()
    }
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

  // Services: Active integrations grouped first
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
      id: "calendar",
      name: "Google Calendar",
      serviceId: "calendar",
      category: "Scheduling & Agendas",
      description: "Schedule meetings, lock sprint deadlines, and sync video conferences.",
      status: "active",
      icon: <CalendarIcon />,
    },
    {
      id: "meet",
      name: "Google Meet",
      serviceId: "meet",
      category: "Video Conferencing",
      description: "Generate instant Google Meet video spaces and schedule team calls.",
      status: "active",
      icon: <MeetIcon />,
    },
    {
      id: "classroom",
      name: "Classroom",
      serviceId: "classroom",
      category: "Education & Courses",
      description: "Manage classes, publish coursework assignments, announcements, and view rosters.",
      status: "active",
      icon: <ClassroomIcon />,
    },
    {
      id: "youtube",
      name: "YouTube",
      serviceId: "youtube",
      category: "Video & Media Intelligence",
      description: "Search videos, extract comments & audience sentiment, analyze channel metrics, and curate playlists.",
      status: "active",
      icon: <YouTubeIcon />,
    },
    {
      id: "telegram",
      name: "Telegram",
      serviceId: "telegram",
      category: "Autonomous Bot Bridge",
      description: "Chat with your AI Copilots from Telegram with mentions (@ceo, @all), photos, and live room sync.",
      status: "active",
      icon: <TelegramIcon />,
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
  ]

  const connectedCount = integrations.filter((i) => i.status === "connected").length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container: Fixed Header + Scrollable Content + Fixed Footer */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-950 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* FIXED HEADER */}
        <div className="shrink-0 px-6 py-4.5 bg-zinc-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusToast && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{statusToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusToast(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TELEGRAM BOT COPILOT BRIDGE CONFIGURATION HUB */}
          {showTelegramConfig && (
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <TelegramIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Telegram Copilot Bridge
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Live Room Sync • @Mentions • Multimodal
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Connect your Telegram bot to chat with your 3D AI Copilots directly from Telegram on mobile or desktop.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTelegramConfig(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mandatory Requirement Banner */}
              {telegramCopilotCount === 0 ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="font-semibold block text-white mb-0.5">
                      Prerequisite: At least 1 Copilot required
                    </strong>
                    You must create at least 1 Copilot (e.g. CEO, CTO, Scout) on noBrain before connecting Telegram. Please close this modal, click &quot;+ New Bot&quot; in the left sidebar, and return here.
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>{telegramCopilotCount} Copilots</strong> will automatically join your dedicated{" "}
                      <code className="text-blue-300 font-mono">Telegram Bridge</code> room.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                      @all
                    </span>
                    {telegramCopilots.slice(0, 4).map((b) => (
                      <span
                        key={b.id}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono"
                      >
                        @{b.username || b.name.toLowerCase()}
                      </span>
                    ))}
                    {telegramCopilots.length > 4 && (
                      <span className="text-[10px] text-zinc-400">+{telegramCopilots.length - 4} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Telegram Bot Token */}
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                    <span>1. Telegram Bot Token from @BotFather</span>
                  </div>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open @BotFather</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Open Telegram, search for <strong>@BotFather</strong>, send <code className="text-zinc-200">/newbot</code>, choose a name and username, and paste the HTTP API Bot Token below:
                </p>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder={
                    telegramBotUsername
                      ? `•••••••••••••••••••• (Connected as @${telegramBotUsername} - paste to replace)`
                      : "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Step 2: Restricted Access & Security Guidance */}
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. Restricted Access Security (Recommended)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={telegramRestrictedAccess}
                      onChange={(e) => setTelegramRestrictedAccess(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-0"
                    />
                    <span className="text-[11px] font-medium text-amber-300">Enable Restricted Access</span>
                  </label>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed">
                  💡 <strong>Security Advice:</strong> Keeping Restricted Access enabled prevents unauthorized users from messaging your bot and consuming your platform wallet tokens. Only the usernames and Chat IDs listed below will be permitted to chat.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">
                      Allowed Telegram Usernames (comma separated)
                    </label>
                    <input
                      type="text"
                      value={telegramAllowedUsernames}
                      onChange={(e) => setTelegramAllowedUsernames(e.target.value)}
                      placeholder="@your_username, @colleague"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">
                      Allowed Telegram Chat IDs (comma separated, optional)
                    </label>
                    <input
                      type="text"
                      value={telegramAllowedChatIds}
                      onChange={(e) => setTelegramAllowedChatIds(e.target.value)}
                      placeholder="e.g. 123456789, 987654321"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Live Room Bridge & Mentions Guide */}
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Webhook className="w-3.5 h-3.5 text-blue-400" />
                  <span>3. How Mentions &amp; Commands work in Telegram</span>
                </div>
                <div className="text-[11px] text-zinc-400 space-y-1 leading-relaxed">
                  <p>• <strong>Autocomplete Suggestions:</strong> In Telegram, typing <code className="text-zinc-200">/</code> opens the native command list showing all your copilots (e.g. <code className="text-blue-300">/ceo</code>, <code className="text-blue-300">/cto</code>, <code className="text-blue-300">/all</code>).</p>
                  <p>• <strong>Direct Tasks:</strong> Type <code className="text-zinc-200">@handle &lt;prompt&gt;</code> or <code className="text-zinc-200">/&lt;handle&gt; &lt;prompt&gt;</code> to assign a task to that specific copilot.</p>
                  <p>• <strong>Photos:</strong> Send any photo or document with a caption to run multimodal vision perception.</p>
                  <p>• <strong>Room Sync:</strong> Every message and reply is mirrored live into your workspace room: <strong>{telegramRoomName}</strong>.</p>
                </div>
              </div>

              {/* Test Message Option (if already connected) */}
              {isConnected("telegram") && (
                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">Send Test Message</span>
                    <span className="text-[10px] text-zinc-400">Verifies live message delivery to Telegram</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      placeholder="Enter your Telegram Chat ID (or leave blank for auto-detected chat)"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <RaisedButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={testingTelegram}
                      onClick={handleTestTelegram}
                      className="!h-8 !rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      {testingTelegram ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send Test</span>
                    </RaisedButton>
                  </div>
                </div>
              )}

              {/* Action Bar for Telegram Setup */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/80">
                <div className="flex flex-wrap items-center gap-2">
                  <RaisedButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={savingTelegram || telegramCopilotCount === 0}
                    onClick={handleSaveTelegram}
                    className="!h-8 !rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {savingTelegram ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isConnected("telegram") ? "Save Settings" : "Connect Telegram Bot"}</span>
                  </RaisedButton>
                </div>

                {isConnected("telegram") && (
                  <RaisedButton
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={connectingService === "telegram"}
                    onClick={handleDisconnectTelegram}
                    className="!h-8 !rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Unplug className="w-3.5 h-3.5" />
                    <span>Disconnect Telegram</span>
                  </RaisedButton>
                )}
              </div>
            </div>
          )}

          {/* 4 COLUMN GRID OF INTEGRATIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {services.map((service) => {
              const active = isConnected(service.serviceId)
              const account = getConnectedAccount(service.serviceId)

              return (
                <div
                  key={service.id}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all ${
                    active
                      ? "bg-zinc-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20"
                      : "bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  {/* Top Bar: Icon + Title + Category + Status Pill */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* 3D Raised Bevel Icon Box without border */}
                        <div className="relative w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-md shadow-zinc-950/20 dark:shadow-black/50 bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 before:absolute before:inset-0 before:border-t before:border-white/40 dark:before:border-white/20 before:bg-gradient-to-b before:from-white/30 dark:before:from-white/10 before:to-transparent before:rounded-2xl group-hover:scale-105 transition-all">
                          {service.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate leading-tight">
                            {service.name}
                          </h3>
                          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block truncate mt-0.5">
                            {service.category}
                          </span>
                        </div>
                      </div>

                      {/* Status Badges */}
                      {active ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 text-emerald-400 text-[10px] font-semibold tracking-wide shrink-0">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      ) : service.status === "coming_soon" ? (
                        <div className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-[10px] font-medium shrink-0">
                          Soon
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium shrink-0">
                          Ready
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account display if connected */}
                  {active && account && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 mb-3 text-[11px] text-zinc-300 font-mono truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 shrink-0" />
                      <span className="truncate">{account}</span>
                    </div>
                  )}

                  {/* Bottom Action Area with RaisedButton */}
                  <div className="pt-2 border-t border-zinc-800/60 mt-auto">
                    {service.serviceId === "telegram" ? (
                      active ? (
                        <div className="flex items-center gap-1.5">
                          <RaisedButton
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={connectingService === "telegram"}
                            onClick={handleDisconnectTelegram}
                            className="flex-1 !h-8 !rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            {connectingService === "telegram" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Unplug className="w-3.5 h-3.5" />
                            )}
                            <span>Disconnect</span>
                          </RaisedButton>
                          <RaisedButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowTelegramConfig((prev) => !prev)}
                            className="!h-8 !px-2.5 !rounded-xl text-xs font-semibold cursor-pointer"
                            title="Telegram Bot Settings"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </RaisedButton>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <RaisedButton
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={connectingService === "telegram"}
                            onClick={() => setShowTelegramConfig(true)}
                            className="flex-1 !h-8 !rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Connect</span>
                          </RaisedButton>
                          <RaisedButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowTelegramConfig((prev) => !prev)}
                            className="!h-8 !px-2.5 !rounded-xl text-xs font-semibold cursor-pointer"
                            title="Configure Telegram Bot Token"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </RaisedButton>
                        </div>
                      )
                    ) : ["gmail", "drive", "calendar", "meet", "classroom", "youtube"].includes(service.serviceId) ? (
                      active ? (
                        <RaisedButton
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={connectingService === service.serviceId}
                          onClick={() => handleDisconnect(service.serviceId)}
                          className="w-full !h-8 !rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          {connectingService === service.serviceId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unplug className="w-3.5 h-3.5" />
                          )}
                          <span>Disconnect</span>
                        </RaisedButton>
                      ) : (
                        <RaisedButton
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={connectingService === service.serviceId}
                          onClick={() => handleConnectGoogleOAuth(service.serviceId)}
                          className="w-full !h-8 !rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          {connectingService === service.serviceId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Connect</span>
                        </RaisedButton>
                      )
                    ) : (
                      <RaisedButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full !h-8 !rounded-xl text-xs opacity-50 cursor-not-allowed"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Coming Soon</span>
                      </RaisedButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="shrink-0 px-6 py-4  bg-zinc-900/60 backdrop-blur-md flex items-center justify-between">
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
