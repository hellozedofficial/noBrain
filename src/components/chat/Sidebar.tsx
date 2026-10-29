"use client"

import React, { useState } from "react"
import {
  SquarePen,
  Trash2,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  Settings,
  Palette,
  Wallet,
  Code2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { User } from "@/components/auth/AuthModal"
import { ThemeMode } from "@/lib/theme"
import Link from "next/link"

export interface Conversation {
  id: string
  title: string
  model: string
  created_at: string
  updated_at: string
}

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string, e: React.MouseEvent) => void
  isLoadingList: boolean
  user: User | null
  onOpenAuth: () => void
  onLogout: () => void
  isOpen: boolean
  onCloseSidebar: () => void
  theme: ThemeMode
  onToggleTheme: () => void
  onOpenSettings?: () => void
  isSaleonicConnected?: boolean
  isCanvasOpen?: boolean
  onOpenCanvas?: () => void
  walletBalance?: number
  isCheckingBalance?: boolean
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isLoadingList,
  user,
  onOpenAuth,
  onLogout,
  isOpen,
  onCloseSidebar,
  theme,
  onToggleTheme,
  onOpenSettings,
  isSaleonicConnected,
  isCanvasOpen,
  onOpenCanvas,
  walletBalance,
  isCheckingBalance,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-sidebar text-foreground select-none shrink-0 border-r border-border-subtle transition-all duration-200 ease-in-out",
        isCanvasOpen
          ? cn(
              "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl",
              isOpen ? "translate-x-0" : "-translate-x-full"
            )
          : cn(
              // Desktop sizing
              isOpen ? "md:w-64" : "md:w-0 md:overflow-hidden md:border-none",
              // Mobile fixed drawer
              "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72 max-md:shadow-2xl",
              isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
            )
      )}
    >
      {/* Top Header */}
      <div className="h-14 px-4 flex items-center justify-between shrink-0">
        <span className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
          noBrain
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewChat}
            title="New chat"
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer"
          >
            <SquarePen className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCloseSidebar}
            title="Collapse sidebar"
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action buttons: New chat & Canvas */}
      <div className="px-3 py-1 shrink-0 space-y-1">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-sidebar-hover transition-colors text-left cursor-pointer"
        >
          <SquarePen className="h-4 w-4 text-muted" />
          <span>New chat</span>
        </button>

        {onOpenCanvas && (
          <button
            type="button"
            onClick={onOpenCanvas}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-foreground hover:bg-sidebar-hover transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Palette className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
              <span>Canvas</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Studio
            </span>
          </button>
        )}
      </div>

      {/* Recents list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        <div className="px-3 pt-3 pb-1.5 text-xs font-medium text-muted">
          Recents
        </div>

        {isLoadingList ? (
          <div className="px-3 py-4 text-xs text-muted">Loading history...</div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted">No conversations yet</div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors",
                  isActive
                    ? "bg-sidebar-hover text-foreground font-medium"
                    : "text-foreground/80 hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                <span className="truncate pr-2">{conv.title || "New chat"}</span>
                <button
                  type="button"
                  title="Delete chat"
                  onClick={(e) => onDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 rounded transition-opacity shrink-0 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Theme Switcher & Profile Section */}
      <div className="p-3 shrink-0 space-y-1.5">
        {/* Wallet Button */}
        {user && (
          <Link
            href="/wallet"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar-hover text-xs text-muted hover:text-foreground transition-colors cursor-pointer no-underline"
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5" />
              <span>Wallet</span>
            </div>
            <span className="text-[10px] font-medium text-green-500">
              {isCheckingBalance ? (
                'Loading...'
              ) : (
                `Balance: ৳${Number(walletBalance ?? 0).toFixed(2)}`
              )}
            </span>
          </Link>
        )}

        {/* Developer / API Keys */}
        {user && (
          <Link
            href="/developer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar-hover text-xs text-muted hover:text-foreground transition-colors cursor-pointer no-underline"
          >
            <div className="flex items-center gap-2">
              <Code2 className="h-3.5 w-3.5" />
              <span>Developer</span>
            </div>
            <span className="text-[10px] text-muted">API Keys</span>
          </Link>
        )}

        {/* Settings & Integrations Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings & Integrations"
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar-hover text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </div>
          {isSaleonicConnected ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Saleonic</span>
            </span>
          ) : (
            <span className="text-[10px] text-muted">Integrations</span>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={`Theme: ${theme}`}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar-hover text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {theme === "system" && <Monitor className="h-3.5 w-3.5" />}
            {theme === "dark" && <Moon className="h-3.5 w-3.5" />}
            {theme === "light" && <Sun className="h-3.5 w-3.5" />}
            <span className="capitalize">Theme: {theme}</span>
          </div>
          <span className="text-[10px] text-muted uppercase">Toggle</span>
        </button>

        {/* User Account / Login */}
        {user ? (
          <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-sidebar-hover transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-foreground truncate">{user.name}</span>
                <span className="text-[10px] text-muted truncate">{user.email}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Log out"
              className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-input-bg border border-input-border hover:bg-sidebar-hover text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogIn className="h-3.5 w-3.5 text-muted" />
              <span>Log In / Sign Up</span>
            </div>
            <span className="text-[10px] text-muted">Save History</span>
          </button>
        )}
      </div>
    </aside>
  )
}
