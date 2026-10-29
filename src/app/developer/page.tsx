"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Copy, Check, Plus, Trash2, Globe, ShieldCheck, Key,
  ExternalLink, Loader2, AlertCircle, BookOpen, BarChart2,
  Clock, ChevronDown, ChevronUp, X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ApiKeyRow {
  id: number
  name: string
  key: string
  domain_allowlist: string | null
  is_active: boolean
  usage_count: number
  last_used_at: string | null
  created_at: string
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create key form state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDomains, setNewDomains] = useState("")
  const [creating, setCreating] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)

  // Domain edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDomains, setEditDomains] = useState("")
  const [savingId, setSavingId] = useState<number | null>(null)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/developer/keys")
      if (res.status === 401) {
        setError("Please log in to access the Developer Dashboard.")
        return
      }
      const data = await res.json()
      setKeys(data.keys ?? [])
    } catch {
      setError("Failed to load API keys. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const domains = newDomains.trim()
        ? newDomains.split(",").map((d) => d.trim()).filter(Boolean)
        : null
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), domains }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewKeyValue(data.key.key)
      setNewName("")
      setNewDomains("")
      setShowCreate(false)
      await fetchKeys()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (keyId: number) => {
    if (!confirm("Are you sure? This key will stop working immediately.")) return
    setRevokingId(keyId)
    try {
      await fetch(`/api/developer/keys/${keyId}`, { method: "DELETE" })
      await fetchKeys()
    } finally {
      setRevokingId(null)
    }
  }

  const handleSaveDomains = async (keyId: number) => {
    setSavingId(keyId)
    try {
      const domains = editDomains.trim()
        ? editDomains.split(",").map((d) => d.trim()).filter(Boolean)
        : null
      await fetch(`/api/developer/keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
      })
      setEditingId(null)
      await fetchKeys()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#ececec]">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-6 bg-[#111] border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-semibold text-[#ececec] hover:text-white transition-colors no-underline">
            noBrain
          </Link>
          <span className="text-[#333]">/</span>
          <span className="text-sm text-[#888] flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5" /> Developer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api/docs"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#888] hover:text-[#ececec] hover:bg-[#1a1a1a] rounded-lg transition-colors no-underline"
          >
            <BookOpen className="h-3 w-3" /> API Docs
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-medium text-[#ececec] bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] rounded-lg transition-colors no-underline"
          >
            Chat
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-10">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">API Keys</h1>
            <p className="text-sm text-[#666]">
              Manage keys for the noBrain public API. Usage is deducted from your wallet.
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); setNewKeyValue(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> New API Key
          </button>
        </div>

        {/* ── New key banner ────────────────────────────────────────── */}
        {newKeyValue && (
          <div className="mb-5 p-4 rounded-xl bg-green-500/8 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Check className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">API Key Created!</span>
              <span className="text-xs text-[#666]">Copy it now — it won't be shown again.</span>
              <button onClick={() => setNewKeyValue(null)} className="ml-auto text-[#555] hover:text-[#888]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg font-mono">
              <code className="flex-1 text-purple-400 text-xs break-all">{newKeyValue}</code>
              <button
                onClick={() => copyToClipboard(newKeyValue, "new")}
                className="shrink-0 p-1.5 rounded-md text-[#555] hover:text-[#aaa] hover:bg-[#1a1a1a] transition-colors"
              >
                {copiedId === "new" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* ── Create key form ───────────────────────────────────────── */}
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-5 p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
            <h3 className="text-sm font-semibold text-white mb-4">Create New API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#666] mb-1.5">
                  Key Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production App"
                  required
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ececec] placeholder-[#444] outline-none focus:border-[#3a3a3a] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-1.5">
                  <Globe className="h-3 w-3 inline mr-1" />
                  Domain Allowlist{" "}
                  <span className="text-[#444] font-normal">(leave blank = all origins allowed)</span>
                </label>
                <input
                  value={newDomains}
                  onChange={(e) => setNewDomains(e.target.value)}
                  placeholder="myapp.com, *.myapp.com, localhost"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ececec] placeholder-[#444] outline-none focus:border-[#3a3a3a] transition-colors"
                />
                <p className="text-xs text-[#444] mt-1">Comma-separated. Wildcards: *.example.com</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                  {creating ? "Creating..." : "Create Key"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-[#666] hover:text-[#aaa] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Error ─────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Keys list ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#444]">
            <Loader2 className="h-7 w-7 animate-spin mb-3" />
            <p className="text-sm">Loading keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#444]">
            <Key className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <KeyCard
                key={k.id}
                k={k}
                copiedId={copiedId}
                revokingId={revokingId}
                editingId={editingId}
                editDomains={editDomains}
                savingId={savingId}
                onCopy={copyToClipboard}
                onRevoke={handleRevoke}
                onEditStart={(id, domains) => { setEditingId(id); setEditDomains(domains ?? "") }}
                onEditCancel={() => setEditingId(null)}
                onEditChange={setEditDomains}
                onEditSave={handleSaveDomains}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-[#333] mt-8">
          Max 10 active keys per account. Usage deducted from wallet balance.
        </p>
      </div>
    </div>
  )
}

// ── KeyCard component ────────────────────────────────────────────────────────

function KeyCard({
  k, copiedId, revokingId, editingId, editDomains, savingId,
  onCopy, onRevoke, onEditStart, onEditCancel, onEditChange, onEditSave,
}: {
  k: ApiKeyRow
  copiedId: string | null
  revokingId: number | null
  editingId: number | null
  editDomains: string
  savingId: number | null
  onCopy: (text: string, id: string) => void
  onRevoke: (id: number) => void
  onEditStart: (id: number, domains: string | null) => void
  onEditCancel: () => void
  onEditChange: (v: string) => void
  onEditSave: (id: number) => void
}) {
  return (
    <div className={cn("p-4 bg-[#111] border border-[#1f1f1f] rounded-xl transition-opacity", !k.is_active && "opacity-50")}>
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className="text-sm font-medium text-white">{k.name}</span>
          {!k.is_active && (
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
              REVOKED
            </span>
          )}
        </div>
        {k.is_active && (
          <button
            onClick={() => onRevoke(k.id)}
            disabled={revokingId === k.id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors disabled:opacity-50"
          >
            {revokingId === k.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Revoke
          </button>
        )}
      </div>

      {/* Key value (masked) */}
      <div className="flex items-center gap-2 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg font-mono mb-3 group">
        <code className="flex-1 text-xs text-[#555] tracking-wider truncate">{k.key}</code>
      </div>

      {/* Stats */}
      <div className="flex gap-5 flex-wrap mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="h-3 w-3 text-[#444]" />
          <span className="text-xs text-[#666]">{k.usage_count.toLocaleString()} requests</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-[#444]" />
          <span className="text-xs text-[#666]">
            {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"}
          </span>
        </div>
        <div className="text-xs text-[#444]">
          Created {new Date(k.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Domain allowlist */}
      {k.is_active && (
        editingId === k.id ? (
          <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
            <label className="text-xs font-medium text-[#666] flex items-center gap-1">
              <Globe className="h-3 w-3" /> Allowed Domains
            </label>
            <input
              value={editDomains}
              onChange={(e) => onEditChange(e.target.value)}
              placeholder="domain.com, *.domain.com (blank = all)"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-[#ececec] placeholder-[#333] outline-none focus:border-[#3a3a3a]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onEditSave(k.id)}
                disabled={savingId === k.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {savingId === k.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Save
              </button>
              <button
                onClick={onEditCancel}
                className="px-3 py-1.5 text-xs text-[#666] hover:text-[#aaa] border border-[#2a2a2a] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-2 border-t border-[#1a1a1a] flex-wrap">
            <ShieldCheck className={cn("h-3.5 w-3.5 shrink-0", k.domain_allowlist ? "text-green-500" : "text-[#333]")} />
            {k.domain_allowlist ? (
              <span className="text-xs text-green-500 font-mono flex-1 truncate">{k.domain_allowlist}</span>
            ) : (
              <span className="text-xs text-[#444] flex-1">All origins allowed</span>
            )}
            <button
              onClick={() => onEditStart(k.id, k.domain_allowlist)}
              className="text-xs text-[#555] hover:text-[#aaa] px-2 py-1 rounded-md hover:bg-[#1a1a1a] transition-colors"
            >
              Edit domains
            </button>
          </div>
        )
      )}
    </div>
  )
}

