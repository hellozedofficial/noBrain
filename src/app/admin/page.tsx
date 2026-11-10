"use client"

import React, { useState, useEffect } from "react"
import {
  Cpu,
  Server,
  CreditCard,
  Mail,
  ShieldCheck,
  Activity,
  Users,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Copy,
  AlertCircle,
  ExternalLink,
  LogOut,
  Lock,
  Sliders,
  Database,
  ArrowUpRight,
  Zap,
  Play,
  Terminal,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Coins,
  Puzzle,
} from "lucide-react"

interface ConfigItem {
  key: string
  value: string
  category: "general" | "ai" | "pricing" | "payment" | "integrations" | "smtp" | "security"
  description: string
  is_secret?: boolean
}

interface PlatformStats {
  totalUsers: number
  totalBots: number
  totalRooms: number
  totalMessages: number
  totalWalletBalance: number
  totalIntegrations: number
  dbStatus: string
  dbLatencyMs: number
}

interface PlatformUser {
  id: string
  name: string
  email: string
  last_used_model: string
  created_at: string
  wallet_balance: number
}

export default function AdminHQPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [passkeyInput, setPasskeyInput] = useState("")
  const [authError, setAuthError] = useState("")
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "ai" | "pricing" | "payment" | "integrations" | "smtp" | "users" | "raw"
  >("overview")

  // State
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("")
  const [saveErrorMessage, setSaveErrorMessage] = useState("")

  // Secret visibility toggle map
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Service test states
  const [testResults, setTestResults] = useState<Record<string, { loading?: boolean; success?: boolean; message?: string; latencyMs?: number; details?: any }>>({})

  // Wallet adjustment modal state
  const [adjustingUser, setAdjustingUser] = useState<PlatformUser | null>(null)
  const [adjustAmount, setAdjustAmount] = useState("100")
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit")
  const [adjustDescription, setAdjustDescription] = useState("Manual Admin Credit")
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false)

  // Simulation calculator state
  const [simInputTokens, setSimInputTokens] = useState(10000)
  const [simOutputTokens, setSimOutputTokens] = useState(2000)

  // Load configs & initial data
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/config")
      if (res.status === 401) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setConfigs(data.configs || [])
        setStats(data.stats || null)
        setIsAuthenticated(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeTab === "users" && isAuthenticated) {
      fetchUsers()
    }
  }, [activeTab, isAuthenticated])

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setAuthError("")
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: passkeyInput.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIsAuthenticated(true)
        setPasskeyInput("")
        fetchData()
      } else {
        setAuthError(data.error || "Authentication rejected. Invalid master passkey.")
      }
    } catch {
      setAuthError("Failed to connect to authentication endpoint.")
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
    } catch {}
    setIsAuthenticated(false)
    setConfigs([])
    setStats(null)
  }

  // Value change tracking
  const handleValueChange = (key: string, val: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: val }))
  }

  const getConfigValue = (key: string): string => {
    if (editedValues[key] !== undefined) {
      return editedValues[key]
    }
    const item = configs.find((c) => c.key === key)
    return item ? item.value : ""
  }

  const hasUnsavedChanges = Object.keys(editedValues).length > 0

  // Save all modified configs
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return
    setIsSaving(true)
    setSaveSuccessMessage("")
    setSaveErrorMessage("")

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: editedValues }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSaveSuccessMessage(`Successfully applied ${Object.keys(editedValues).length} configurations!`)
        // Update local configs view
        setConfigs((prev) =>
          prev.map((c) => (editedValues[c.key] !== undefined ? { ...c, value: editedValues[c.key] } : c))
        )
        setEditedValues({})
        setTimeout(() => setSaveSuccessMessage(""), 4000)
      } else {
        setSaveErrorMessage(data.error || "Failed to persist configuration.")
      }
    } catch (e: any) {
      setSaveErrorMessage(e.message || "Network error while saving.")
    } finally {
      setIsSaving(false)
    }
  }

  // Service test runner
  const runServiceTest = async (serviceName: "database" | "bedrock" | "smtp" | "eps") => {
    setTestResults((prev) => ({
      ...prev,
      [serviceName]: { loading: true },
    }))

    try {
      const res = await fetch("/api/admin/test-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: serviceName }),
      })
      const data = await res.json()
      setTestResults((prev) => ({
        ...prev,
        [serviceName]: {
          loading: false,
          success: data.success,
          message: data.message || data.error,
          latencyMs: data.latencyMs,
          details: data.details,
        },
      }))
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [serviceName]: {
          loading: false,
          success: false,
          message: e.message || "Test request failed",
        },
      }))
    }
  }

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(label)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Wallet adjustment submit
  const handleWalletAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustingUser) return
    setIsAdjustingWallet(true)

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustingUser.id,
          amount: adjustAmount,
          type: adjustType,
          description: adjustDescription,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === adjustingUser.id ? { ...u, wallet_balance: data.newBalance } : u))
        )
        setAdjustingUser(null)
      } else {
        alert(data.error || "Failed to adjust balance")
      }
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setIsAdjustingWallet(false)
    }
  }

  // 1. Loading Splash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-zinc-300 flex flex-col items-center justify-center font-sans">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-sm tracking-wider uppercase text-zinc-400">noBrain // HQ Loading</span>
        </div>
        <div className="text-xs text-zinc-600 font-mono">Connecting to nobrain-hq.saleonic.com</div>
      </div>
    )
  }

  // 2. Lock Screen / Passkey Auth Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-[#141414] border border-[#222222] rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#222222]">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono font-medium text-sm tracking-tight text-zinc-200">noBrain // HQ</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest px-2 py-0.5 bg-[#1c1c1c] rounded border border-[#27272a]">
              Console
            </span>
          </div>

          <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
            Enter the master administrator key to manage VPS runtime parameters, AI orchestrations, pricing, and gateway keys.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Master Passkey
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter admin passkey..."
                  autoFocus
                  required
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 font-mono outline-none transition-all"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-900/60 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Key...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Authenticate Console</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#222222] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Domain: nobrain-hq.saleonic.com</span>
            <span>Port: 3005</span>
          </div>
        </div>
      </div>
    )
  }

  // 3. Authenticated HQ Dashboard
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-zinc-200 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Bar */}
      <header className="h-14 bg-[#121212] border-b border-[#222222] px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-mono font-semibold text-sm tracking-tight text-white">noBrain // HQ</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#1c1c1c] text-zinc-400 border border-[#27272a]">
            <span>host:</span>
            <span className="text-zinc-200">nobrain-hq.saleonic.com</span>
            <span className="text-zinc-500">:3005</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-mono hidden md:inline">
                ● {Object.keys(editedValues).length} unsaved changes
              </span>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-xs transition-colors shadow-lg disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          )}

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#282828] text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span>Open Platform</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <button
            onClick={handleLogout}
            title="Log out of HQ"
            className="p-1.5 rounded-lg hover:bg-[#222222] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Save Notifications */}
      {saveSuccessMessage && (
        <div className="bg-emerald-950/40 border-b border-emerald-900/60 text-emerald-400 px-6 py-2 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage("")} className="hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="bg-red-950/40 border-b border-red-900/60 text-red-400 px-6 py-2 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>{saveErrorMessage}</span>
          </div>
          <button onClick={() => setSaveErrorMessage("")} className="hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-60 bg-[#121212] border-r border-[#222222] p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible shrink-0">
          <div className="hidden md:block px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            HQ System Modules
          </div>

          {[
            { id: "overview", label: "Overview & Health", icon: Activity },
            { id: "ai", label: "AI & Bedrock Engine", icon: Cpu },
            { id: "pricing", label: "Pricing & Tokens (BDT)", icon: Coins },
            { id: "payment", label: "EPS Gateway", icon: CreditCard },
            { id: "integrations", label: "Google & Integrations", icon: Puzzle },
            { id: "smtp", label: "SMTP Mailer", icon: Mail },
            { id: "users", label: "Users & Wallets", icon: Users },
            { id: "raw", label: "Raw Config Registry", icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left shrink-0 md:shrink ${
                  isActive
                    ? "bg-[#212121] text-white border border-[#2e2e2e]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}

          <div className="mt-auto hidden md:block pt-4 border-t border-[#222222] px-3">
            <div className="text-[11px] text-zinc-500 font-mono">noBrain Core v1.5</div>
            <div className="text-[10px] text-zinc-600 font-mono mt-0.5">VPS Production Ready</div>
          </div>
        </aside>

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-6xl">
          {/* TAB 1: OVERVIEW & HEALTH */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">System Overview & Diagnostics</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Live metrics, database status, and real-time connectivity status across noBrain platform subsystems.
                </p>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { label: "Registered Users", value: stats?.totalUsers || 0, icon: Users, sub: "Platform Accounts" },
                  { label: "Active Copilots", value: stats?.totalBots || 0, icon: Cpu, sub: "CEO, CTO, CBO & Custom" },
                  { label: "Multi-Agent Rooms", value: stats?.totalRooms || 0, icon: Puzzle, sub: "Active Squad Workspaces" },
                  { label: "Chat Messages", value: stats?.totalMessages || 0, icon: Activity, sub: "Total Bedrock Turns" },
                  {
                    label: "Total Wallet Balances",
                    value: `BDT ${(stats?.totalWalletBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                    icon: Coins,
                    sub: "Prepaid User Funds",
                  },
                  { label: "Connected Integrations", value: stats?.totalIntegrations || 0, icon: ShieldCheck, sub: "Active OAuth Accounts" },
                  {
                    label: "MySQL Database",
                    value: stats?.dbStatus === "healthy" ? "Healthy" : "Check Logs",
                    icon: Database,
                    sub: `Latency: ${stats?.dbLatencyMs || 0}ms`,
                    statusColor: stats?.dbStatus === "healthy" ? "text-emerald-400" : "text-red-400",
                  },
                  {
                    label: "Environment Host",
                    value: "nobrain-hq",
                    icon: Server,
                    sub: "Port: 3005 // VPS",
                  },
                ].map((s, idx) => {
                  const Icon = s.icon
                  return (
                    <div key={idx} className="bg-[#141414] border border-[#222222] rounded-xl p-4">
                      <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider">{s.label}</span>
                        <Icon className="w-3.5 h-3.5 text-zinc-600" />
                      </div>
                      <div className={`text-xl font-mono font-semibold tracking-tight ${s.statusColor || "text-zinc-100"}`}>
                        {s.value}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1 font-mono">{s.sub}</div>
                    </div>
                  )
                })}
              </div>

              {/* Live Connectivity Diagnostic Section */}
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-medium text-white">Live Subsystem Health Checks</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Click test to run a live ping against external APIs.</p>
                  </div>
                  <button
                    onClick={() => {
                      runServiceTest("database")
                      runServiceTest("bedrock")
                      runServiceTest("smtp")
                      runServiceTest("eps")
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#212121] hover:bg-[#282828] border border-[#2f2f2f] text-xs text-zinc-300 font-mono transition-colors"
                  >
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>Run All Tests</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: "database", name: "MySQL Database", desc: "Local / Production Database pool connection" },
                    { id: "bedrock", name: "AWS Bedrock AI", desc: "Converse API model availability & auth" },
                    { id: "smtp", name: "SMTP Mail Transport", desc: "Nodemailer transport credentials & server response" },
                    { id: "eps", name: "EPS Payment Gateway", desc: "Merchant configuration & sandbox check" },
                  ].map((srv) => {
                    const result = testResults[srv.id]
                    return (
                      <div
                        key={srv.id}
                        className="p-3.5 rounded-lg bg-[#191919] border border-[#262626] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-200">{srv.name}</span>
                            {result?.success !== undefined && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                  result.success
                                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-900"
                                    : "bg-red-950/60 text-red-400 border-red-900"
                                }`}
                              >
                                {result.success ? `PASS (${result.latencyMs}ms)` : "FAIL"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {result?.message ? result.message : srv.desc}
                          </div>
                        </div>

                        <button
                          onClick={() => runServiceTest(srv.id as any)}
                          disabled={result?.loading}
                          className="px-2.5 py-1 rounded bg-[#242424] hover:bg-[#2e2e2e] border border-[#333333] text-[11px] text-zinc-300 font-mono transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {result?.loading ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />
                          ) : (
                            <Play className="w-3 h-3 text-zinc-400" />
                          )}
                          <span>{result?.loading ? "Testing..." : "Test"}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI & BEDROCK CONFIGURATION */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">AI & Bedrock Engine Settings</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure default foundation models, multimodal vision, inference token limits, and prompt temperature.
                </p>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Primary Bedrock Model ID
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("AWS_BEDROCK_MODEL_ID")}
                      onChange={(e) => handleValueChange("AWS_BEDROCK_MODEL_ID", e.target.value)}
                      placeholder="e.g. openai.gpt-oss-120b-1:0 or anthropic.claude-3-5-sonnet-..."
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Used by all direct copilots (CEO, CTO, CBO) and squad rooms for chat stream generation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Vision Perception Model ID
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("VISION_BEDROCK_MODEL_ID")}
                      onChange={(e) => handleValueChange("VISION_BEDROCK_MODEL_ID", e.target.value)}
                      placeholder="e.g. amazon.nova-pro-v1:0"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Performs deep OCR, color, and UI breakdown when users attach screenshots or diagrams.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      AWS Region
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("AWS_REGION")}
                      onChange={(e) => handleValueChange("AWS_REGION", e.target.value)}
                      placeholder="us-east-1"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Context Window Limit (Tokens)
                    </label>
                    <input
                      type="number"
                      value={getConfigValue("CHAT_CONTEXT_WINDOW_LIMIT")}
                      onChange={(e) => handleValueChange("CHAT_CONTEXT_WINDOW_LIMIT", e.target.value)}
                      placeholder="128000"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">Default 128,000 tokens for long-context discussions.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Sampling Temperature
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("BEDROCK_TEMPERATURE")}
                      onChange={(e) => handleValueChange("BEDROCK_TEMPERATURE", e.target.value)}
                      placeholder="0.7"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Max Output Tokens Per Turn
                    </label>
                    <input
                      type="number"
                      value={getConfigValue("BEDROCK_MAX_TOKENS")}
                      onChange={(e) => handleValueChange("BEDROCK_MAX_TOKENS", e.target.value)}
                      placeholder="2500"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                  <div className="text-xs text-zinc-400 font-mono">
                    Model: {getConfigValue("AWS_BEDROCK_MODEL_ID")} // Region: {getConfigValue("AWS_REGION")}
                  </div>
                  <button
                    onClick={() => runServiceTest("bedrock")}
                    disabled={testResults["bedrock"]?.loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2b2b2b] text-xs text-zinc-200 font-mono border border-[#333333] transition-colors"
                  >
                    {testResults["bedrock"]?.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Test Bedrock Connection</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & TOKEN BILLING */}
          {activeTab === "pricing" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">Pricing & Token Billing (BDT)</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage input and output token rates per 1,000,000 tokens, recharge minimums, and calculate usage margins.
                </p>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Input Price / 1M Tokens (BDT)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-500">৳</span>
                      <input
                        type="number"
                        step="0.01"
                        value={getConfigValue("PLATFORM_INPUT_PER_MILLION_PRICE")}
                        onChange={(e) => handleValueChange("PLATFORM_INPUT_PER_MILLION_PRICE", e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg pl-7 pr-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">Charged for user query & conversation history.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Output Price / 1M Tokens (BDT)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-500">৳</span>
                      <input
                        type="number"
                        step="0.01"
                        value={getConfigValue("PLATFORM_OUTPUT_PER_MILLION_PRICE")}
                        onChange={(e) => handleValueChange("PLATFORM_OUTPUT_PER_MILLION_PRICE", e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg pl-7 pr-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">Charged for stream responses & tool thoughts.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Minimum Top-up Amount (BDT)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-500">৳</span>
                      <input
                        type="number"
                        value={getConfigValue("PLATFORM_MINIMUM_RECHARGE_AMOUNT")}
                        onChange={(e) => handleValueChange("PLATFORM_MINIMUM_RECHARGE_AMOUNT", e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg pl-7 pr-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">Minimum recharge enforced at checkout.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#222222] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="prepaid_only"
                      checked={getConfigValue("PLATFORM_PREPAID_ONLY") === "true"}
                      onChange={(e) => handleValueChange("PLATFORM_PREPAID_ONLY", e.target.checked ? "true" : "false")}
                      className="rounded border-[#333333] bg-[#1c1c1c] accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="prepaid_only" className="text-xs text-zinc-300 font-medium cursor-pointer">
                      Enforce Prepaid Only (Prevent negative balances)
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">Default Currency: BDT</span>
                </div>
              </div>

              {/* Interactive Cost Calculator */}
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-5">
                <h2 className="text-sm font-medium text-white mb-1">Token Billing Simulation Calculator</h2>
                <p className="text-xs text-zinc-400 mb-4">
                  Estimate user cost per interaction based on the current pricing rates configured above.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Sample Input Tokens: {simInputTokens.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min={100}
                      max={100000}
                      step={500}
                      value={simInputTokens}
                      onChange={(e) => setSimInputTokens(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Sample Output Tokens: {simOutputTokens.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={8000}
                      step={50}
                      value={simOutputTokens}
                      onChange={(e) => setSimOutputTokens(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>

                {(() => {
                  const inRate = parseFloat(getConfigValue("PLATFORM_INPUT_PER_MILLION_PRICE") || "10")
                  const outRate = parseFloat(getConfigValue("PLATFORM_OUTPUT_PER_MILLION_PRICE") || "15")
                  const inCost = (simInputTokens / 1_000_000) * inRate
                  const outCost = (simOutputTokens / 1_000_000) * outRate
                  const total = inCost + outCost
                  return (
                    <div className="mt-4 p-3.5 rounded-lg bg-[#1a1a1a] border border-[#292929] flex items-center justify-between font-mono text-xs">
                      <div className="flex gap-4 text-zinc-400">
                        <span>Input Cost: ৳{inCost.toFixed(4)}</span>
                        <span>Output Cost: ৳{outCost.toFixed(4)}</span>
                      </div>
                      <div className="text-emerald-400 font-semibold">
                        Total Deducted: ৳{total.toFixed(4)} BDT
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* TAB 4: EPS PAYMENT GATEWAY */}
          {activeTab === "payment" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">EPS Payment Gateway Configuration</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage Easy Payment System (EPS) merchant parameters, sandbox testing switches, and wallet recharge hooks.
                </p>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="eps_enabled"
                      checked={getConfigValue("PLATFORM_EPS_ENABLED") === "true"}
                      onChange={(e) => handleValueChange("PLATFORM_EPS_ENABLED", e.target.checked ? "true" : "false")}
                      className="rounded border-[#333333] bg-[#1c1c1c] accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="eps_enabled" className="text-xs text-zinc-200 font-medium cursor-pointer">
                      Enable EPS Gateway on Wallet Recharge Page
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-mono">Sandbox Mode:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleValueChange(
                          "PLATFORM_EPS_SANDBOX",
                          getConfigValue("PLATFORM_EPS_SANDBOX") === "true" ? "false" : "true"
                        )
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                        getConfigValue("PLATFORM_EPS_SANDBOX") === "true"
                          ? "bg-amber-950/40 text-amber-400 border-amber-900"
                          : "bg-emerald-950/40 text-emerald-400 border-emerald-900"
                      }`}
                    >
                      {getConfigValue("PLATFORM_EPS_SANDBOX") === "true" ? "SANDBOX (TEST)" : "LIVE (PRODUCTION)"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      EPS Merchant ID
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("PLATFORM_EPS_MERCHANT_ID")}
                      onChange={(e) => handleValueChange("PLATFORM_EPS_MERCHANT_ID", e.target.value)}
                      placeholder="e.g. 29e86e70-0ac6-..."
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      EPS Store ID
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("PLATFORM_EPS_STORE_ID")}
                      onChange={(e) => handleValueChange("PLATFORM_EPS_STORE_ID", e.target.value)}
                      placeholder="e.g. d44e705f-9e3a-..."
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      EPS Account Username / Email
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("PLATFORM_EPS_USERNAME")}
                      onChange={(e) => handleValueChange("PLATFORM_EPS_USERNAME", e.target.value)}
                      placeholder="e.g. merchant@company.com"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Public Redirect Base URL
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("APP_URL")}
                      onChange={(e) => handleValueChange("APP_URL", e.target.value)}
                      placeholder="https://ai.saleonic.com"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">Must match domain registered with EPS gateway IPN.</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-mono">
                    Device Type ID: 1 // Currency: BDT
                  </span>
                  <button
                    onClick={() => runServiceTest("eps")}
                    disabled={testResults["eps"]?.loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2b2b2b] text-xs text-zinc-200 font-mono border border-[#333333] transition-colors"
                  >
                    {testResults["eps"]?.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Verify Gateway Status</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GOOGLE OAUTH & INTEGRATIONS */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">Google OAuth & Workspace Integrations</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage OAuth credentials for Gmail API and Google Drive, and configure authorized callback redirect URIs.
                </p>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Google OAuth Client ID
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={getConfigValue("GOOGLE_CLIENT_ID")}
                        onChange={(e) => handleValueChange("GOOGLE_CLIENT_ID", e.target.value)}
                        className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(getConfigValue("GOOGLE_CLIENT_ID"), "client_id")}
                        className="p-2 rounded-lg bg-[#202020] hover:bg-[#282828] text-zinc-400 hover:text-zinc-200 border border-[#2e2e2e]"
                        title="Copy Client ID"
                      >
                        {copiedKey === "client_id" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Google OAuth Client Secret
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type={revealedSecrets["GOOGLE_CLIENT_SECRET"] ? "text" : "password"}
                        value={getConfigValue("GOOGLE_CLIENT_SECRET")}
                        onChange={(e) => handleValueChange("GOOGLE_CLIENT_SECRET", e.target.value)}
                        className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      />
                      <button
                        onClick={() =>
                          setRevealedSecrets((prev) => ({
                            ...prev,
                            GOOGLE_CLIENT_SECRET: !prev["GOOGLE_CLIENT_SECRET"],
                          }))
                        }
                        className="p-2 rounded-lg bg-[#202020] hover:bg-[#282828] text-zinc-400 hover:text-zinc-200 border border-[#2e2e2e]"
                        title="Reveal Secret"
                      >
                        {revealedSecrets["GOOGLE_CLIENT_SECRET"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Authorized Redirect URIs Reference */}
                <div className="pt-3 border-t border-[#222222]">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    Required Google Cloud Console Redirect URIs
                  </label>
                  <p className="text-xs text-zinc-400 mb-3">
                    Ensure both production domains and local development ports are listed under Authorized redirect URIs in Google Cloud Console:
                  </p>
                  <div className="space-y-1.5 font-mono text-xs">
                    {[
                      "https://ai.saleonic.com/api/auth/google/callback",
                      "https://nobrain-hq.saleonic.com/api/auth/google/callback",
                      "http://localhost:3000/api/auth/google/callback",
                      "http://localhost:3005/api/auth/google/callback",
                    ].map((uri, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-[#1b1b1b] border border-[#262626]">
                        <span className="text-zinc-300">{uri}</span>
                        <button
                          onClick={() => copyToClipboard(uri, `uri_${i}`)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                        >
                          {copiedKey === `uri_${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SMTP MAILER */}
          {activeTab === "smtp" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">SMTP Mail Server Settings</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure outgoing transactional email transport (password resets, system notifications, copilot email fallbacks).
                </p>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("MAIL_HOST")}
                      onChange={(e) => handleValueChange("MAIL_HOST", e.target.value)}
                      placeholder="e.g. email-smtp.us-east-1.amazonaws.com"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                        Port
                      </label>
                      <input
                        type="number"
                        value={getConfigValue("MAIL_PORT")}
                        onChange={(e) => handleValueChange("MAIL_PORT", e.target.value)}
                        placeholder="587"
                        className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                        Encryption
                      </label>
                      <select
                        value={getConfigValue("MAIL_ENCRYPTION")}
                        onChange={(e) => handleValueChange("MAIL_ENCRYPTION", e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      >
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("MAIL_USERNAME")}
                      onChange={(e) => handleValueChange("MAIL_USERNAME", e.target.value)}
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      SMTP Password
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type={revealedSecrets["MAIL_PASSWORD"] ? "text" : "password"}
                        value={getConfigValue("MAIL_PASSWORD")}
                        onChange={(e) => handleValueChange("MAIL_PASSWORD", e.target.value)}
                        className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                      />
                      <button
                        onClick={() =>
                          setRevealedSecrets((prev) => ({
                            ...prev,
                            MAIL_PASSWORD: !prev["MAIL_PASSWORD"],
                          }))
                        }
                        className="p-2 rounded-lg bg-[#202020] hover:bg-[#282828] text-zinc-400 hover:text-zinc-200 border border-[#2e2e2e]"
                      >
                        {revealedSecrets["MAIL_PASSWORD"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Default From Address
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("MAIL_FROM_ADDRESS")}
                      onChange={(e) => handleValueChange("MAIL_FROM_ADDRESS", e.target.value)}
                      placeholder="support@saleonic.com"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Default Sender Display Name
                    </label>
                    <input
                      type="text"
                      value={getConfigValue("MAIL_FROM_NAME")}
                      onChange={(e) => handleValueChange("MAIL_FROM_NAME", e.target.value)}
                      placeholder="noBrain"
                      className="w-full bg-[#1c1c1c] border border-[#2a2a2a] focus:border-zinc-400 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-mono">
                    Sender: {getConfigValue("MAIL_FROM_ADDRESS")}
                  </span>
                  <button
                    onClick={() => runServiceTest("smtp")}
                    disabled={testResults["smtp"]?.loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2b2b2b] text-xs text-zinc-200 font-mono border border-[#333333] transition-colors"
                  >
                    {testResults["smtp"]?.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>Verify SMTP Connection</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: USERS & WALLETS */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white tracking-tight">Platform Users & Balances</h1>
                  <p className="text-xs text-zinc-400 mt-1">
                    Inspect user accounts, prepaid wallet balances, and manually adjust credits if needed.
                  </p>
                </div>
                <button
                  onClick={fetchUsers}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#252525] border border-[#2a2a2a] text-xs text-zinc-300 font-mono transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Users</span>
                </button>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222222] bg-[#181818] text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-2.5">User</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Wallet Balance (BDT)</th>
                      <th className="px-4 py-2.5">Default Model</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020] text-xs font-mono">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                          No users registered yet.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-[#191919] transition-colors">
                          <td className="px-4 py-3 font-medium text-zinc-200">{u.name}</td>
                          <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                          <td className="px-4 py-3 text-emerald-400 font-semibold">
                            ৳{Number(u.wallet_balance).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-[11px] truncate max-w-[180px]">
                            {u.last_used_model || "default"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setAdjustingUser(u)}
                              className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#2b2b2b] border border-[#2e2e2e] text-[11px] text-zinc-300 transition-colors"
                            >
                              Adjust Balance
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Balance Adjust Modal */}
              {adjustingUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 max-w-sm w-full shadow-2xl">
                    <h3 className="text-sm font-semibold text-white mb-1">Adjust Wallet Balance</h3>
                    <p className="text-xs text-zinc-400 mb-4 font-mono">
                      Target User: <span className="text-zinc-200">{adjustingUser.email}</span>
                    </p>

                    <form onSubmit={handleWalletAdjustSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Action Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setAdjustType("credit")}
                            className={`py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                              adjustType === "credit"
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                                : "bg-[#1c1c1c] text-zinc-400 border-[#2a2a2a]"
                            }`}
                          >
                            + Credit (Add)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustType("debit")}
                            className={`py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                              adjustType === "debit"
                                ? "bg-red-950/60 text-red-400 border-red-800"
                                : "bg-[#1c1c1c] text-zinc-400 border-[#2a2a2a]"
                            }`}
                          >
                            - Debit (Subtract)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Amount (BDT)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          required
                          className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Reason / Note</label>
                        <input
                          type="text"
                          value={adjustDescription}
                          onChange={(e) => setAdjustDescription(e.target.value)}
                          className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
                        <button
                          type="button"
                          onClick={() => setAdjustingUser(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isAdjustingWallet}
                          className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs font-mono"
                        >
                          {isAdjustingWallet ? "Updating..." : "Confirm Adjustment"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: RAW CONFIG REGISTRY */}
          {activeTab === "raw" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">Raw Configuration Registry</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Direct database-backed key-value registry. Changes override environment variables in real time.
                </p>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222222] bg-[#181818] text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-2.5">Key</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Active Value</th>
                      <th className="px-4 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020] text-xs font-mono">
                    {configs.map((c) => (
                      <tr key={c.key} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3 font-semibold text-zinc-200 select-all">{c.key}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#222222] text-zinc-400 border border-[#2b2b2b]">
                            {c.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={getConfigValue(c.key)}
                            onChange={(e) => handleValueChange(c.key, e.target.value)}
                            className="w-full bg-[#1c1c1c] border border-[#282828] focus:border-zinc-400 rounded px-2.5 py-1 text-xs text-zinc-100 font-mono outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-[11px] text-zinc-500 max-w-xs truncate">{c.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

