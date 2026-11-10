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
  BrainCircuit,
  Search,
  Trash2,
  Edit2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Layers,
  HelpCircle,
} from "lucide-react"

interface ConfigItem {
  key: string
  value: string
  category: "general" | "ai" | "pricing" | "payment" | "integrations" | "smtp" | "security"
  description: string
  is_secret?: boolean
}

interface PlatformModel {
  id: string
  name: string
  provider: string
  description?: string
  inputText: boolean
  inputImage: boolean
  outputText: boolean
  outputImage: boolean
  inputPricePerMillion: number
  outputPricePerMillion: number
  isActive: boolean
  isDefault: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
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
    "overview" | "models" | "pricing" | "users" | "gateways" | "smtp" | "registry"
  >("overview")

  // State
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [models, setModels] = useState<PlatformModel[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("")
  const [saveErrorMessage, setSaveErrorMessage] = useState("")

  // Model Modal State
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<PlatformModel | null>(null)
  const [modelFormId, setModelFormId] = useState("")
  const [modelFormName, setModelFormName] = useState("")
  const [modelFormProvider, setModelFormProvider] = useState("openrouter")
  const [modelFormDesc, setModelFormDesc] = useState("")
  const [modelFormInputText, setModelFormInputText] = useState(true)
  const [modelFormInputImage, setModelFormInputImage] = useState(false)
  const [modelFormOutputText, setModelFormOutputText] = useState(true)
  const [modelFormOutputImage, setModelFormOutputImage] = useState(false)
  const [modelFormInputPrice, setModelFormInputPrice] = useState("60")
  const [modelFormOutputPrice, setModelFormOutputPrice] = useState("110")
  const [modelFormIsActive, setModelFormIsActive] = useState(true)
  const [modelFormIsDefault, setModelFormIsDefault] = useState(false)
  const [modelSearchQuery, setModelSearchQuery] = useState("")
  const [isSearchingOpenRouter, setIsSearchingOpenRouter] = useState(false)
  const [openRouterSuggestions, setOpenRouterSuggestions] = useState<any[]>([])

  // Secret visibility toggle map
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Service test states
  const [testResults, setTestResults] = useState<Record<string, { loading?: boolean; success?: boolean; message?: string; latencyMs?: number; details?: any }>>({})

  // Wallet adjustment modal state
  const [adjustingUser, setAdjustingUser] = useState<PlatformUser | null>(null)
  const [adjustAmount, setAdjustAmount] = useState("100")
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit")
  const [adjustDescription, setAdjustDescription] = useState("Manual Admin Adjustment")
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false)

  // User search
  const [userSearchTerm, setUserSearchTerm] = useState("")

  // Check auth session on mount
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const res = await fetch("/api/admin/config")
      if (res.ok) {
        setIsAuthenticated(true)
        loadAllData()
      } else {
        setIsAuthenticated(false)
        setIsLoading(false)
      }
    } catch {
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [configRes, usersRes, modelsRes] = await Promise.all([
        fetch("/api/admin/config"),
        fetch("/api/admin/users"),
        fetch("/api/admin/models"),
      ])

      if (configRes.ok) {
        const cData = await configRes.json()
        setConfigs(cData.configs || [])
        setStats(cData.stats || null)
        const initialEdits: Record<string, string> = {}
        ;(cData.configs || []).forEach((c: ConfigItem) => {
          initialEdits[c.key] = c.value
        })
        setEditedValues(initialEdits)
      }

      if (usersRes.ok) {
        const uData = await usersRes.json()
        setUsers(uData.users || [])
      }

      if (modelsRes.ok) {
        const mData = await modelsRes.json()
        setModels(mData.models || [])
      }
    } catch (err) {
      console.error("Failed to load admin data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passkeyInput.trim()) return
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
        loadAllData()
      } else {
        setAuthError(data.error || "Authentication failed. Invalid Admin Passkey.")
      }
    } catch {
      setAuthError("Network error verifying admin passkey.")
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
      setIsAuthenticated(false)
    } catch {
      setIsAuthenticated(false)
    }
  }

  const handleSaveConfigs = async () => {
    setIsSaving(true)
    setSaveSuccessMessage("")
    setSaveErrorMessage("")

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: editedValues }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSaveSuccessMessage("Settings applied and synchronized across the platform.")
        loadAllData()
        setTimeout(() => setSaveSuccessMessage(""), 4000)
      } else {
        setSaveErrorMessage(data.error || "Failed to save configuration.")
      }
    } catch (err: any) {
      setSaveErrorMessage(err.message || "Network error while saving settings.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRunServiceTest = async (service: string) => {
    setTestResults((prev) => ({ ...prev, [service]: { loading: true } }))
    try {
      const res = await fetch("/api/admin/test-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      })
      const data = await res.json()
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          loading: false,
          success: res.ok && data.success,
          message: data.message || data.error || (res.ok ? "Connected" : "Failed"),
          latencyMs: data.latencyMs,
          details: data.details,
        },
      }))
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          loading: false,
          success: false,
          message: err.message || "Connection failed",
        },
      }))
    }
  }

  // Open Model Modal for Create or Edit
  const handleOpenModelModal = (model?: PlatformModel) => {
    if (model) {
      setEditingModel(model)
      setModelFormId(model.id)
      setModelFormName(model.name)
      setModelFormProvider(model.provider)
      setModelFormDesc(model.description || "")
      setModelFormInputText(model.inputText)
      setModelFormInputImage(model.inputImage)
      setModelFormOutputText(model.outputText)
      setModelFormOutputImage(model.outputImage)
      setModelFormInputPrice(String(model.inputPricePerMillion))
      setModelFormOutputPrice(String(model.outputPricePerMillion))
      setModelFormIsActive(model.isActive)
      setModelFormIsDefault(model.isDefault)
    } else {
      setEditingModel(null)
      setModelFormId("")
      setModelFormName("")
      setModelFormProvider("openrouter")
      setModelFormDesc("")
      setModelFormInputText(true)
      setModelFormInputImage(false)
      setModelFormOutputText(true)
      setModelFormOutputImage(false)
      setModelFormInputPrice("60")
      setModelFormOutputPrice("110")
      setModelFormIsActive(true)
      setModelFormIsDefault(false)
    }
    setOpenRouterSuggestions([])
    setIsModelModalOpen(true)
  }

  // Save Model
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modelFormId.trim() || !modelFormName.trim()) {
      alert("Model Slug (ID) and Model Display Name are required.")
      return
    }

    try {
      const payload = {
        id: modelFormId.trim(),
        name: modelFormName.trim(),
        provider: modelFormProvider,
        description: modelFormDesc.trim(),
        inputText: modelFormInputText,
        inputImage: modelFormInputImage,
        outputText: modelFormOutputText,
        outputImage: modelFormOutputImage,
        inputPricePerMillion: parseFloat(modelFormInputPrice) || 0,
        outputPricePerMillion: parseFloat(modelFormOutputPrice) || 0,
        isActive: modelFormIsActive,
        isDefault: modelFormIsDefault,
      }

      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsModelModalOpen(false)
        loadAllData()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to save model")
      }
    } catch (err: any) {
      alert(err.message || "Error saving model")
    }
  }

  // Toggle Model Active State
  const handleToggleModelActive = async (model: PlatformModel) => {
    try {
      await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...model,
          isActive: !model.isActive,
        }),
      })
      loadAllData()
    } catch (err) {
      console.error("Failed to toggle model active state:", err)
    }
  }

  // Delete Model
  const handleDeleteModel = async (modelId: string) => {
    if (!confirm(`Are you sure you want to remove model "${modelId}"?`)) return
    try {
      const res = await fetch(`/api/admin/models?id=${encodeURIComponent(modelId)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        loadAllData()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to delete model")
      }
    } catch (err: any) {
      alert(err.message || "Error deleting model")
    }
  }

  // Search OpenRouter for quick auto-fill
  const handleSearchOpenRouter = async (q: string) => {
    setModelSearchQuery(q)
    if (!q || q.length < 2) {
      setOpenRouterSuggestions([])
      return
    }

    setIsSearchingOpenRouter(true)
    try {
      const res = await fetch(`/api/admin/models/openrouter?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setOpenRouterSuggestions(data.models || [])
      }
    } catch {} finally {
      setIsSearchingOpenRouter(false)
    }
  }

  const handleSelectOpenRouterSuggestion = (s: any) => {
    setModelFormId(s.id)
    setModelFormName(s.name)
    setModelFormProvider("openrouter")
    setModelFormDesc(s.description || "")

    const inputs = s.architecture?.inputModalities || ["text"]
    const outputs = s.architecture?.outputModalities || ["text"]

    setModelFormInputText(inputs.includes("text"))
    setModelFormInputImage(inputs.includes("image"))
    setModelFormOutputText(outputs.includes("text"))
    setModelFormOutputImage(outputs.includes("image"))

    // Convert OpenRouter USD prompt pricing to BDT per 1M estimate (e.g. 1 USD = 120 BDT)
    const promptUsd = parseFloat(s.pricing?.prompt || "0.000001")
    const compUsd = parseFloat(s.pricing?.completion || "0.000002")
    const bdtPerPromptMillion = Math.max(10, Math.round(promptUsd * 1000000 * 130))
    const bdtPerCompMillion = Math.max(20, Math.round(compUsd * 1000000 * 130))

    setModelFormInputPrice(String(bdtPerPromptMillion))
    setModelFormOutputPrice(String(bdtPerCompMillion))
    setOpenRouterSuggestions([])
  }

  // Submit wallet adjustment
  const handleAdjustWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustingUser) return
    const num = parseFloat(adjustAmount)
    if (isNaN(num) || num <= 0) return

    setIsAdjustingWallet(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustingUser.id,
          amount: num,
          type: adjustType,
          description: adjustDescription,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setAdjustingUser(null)
        setAdjustAmount("100")
        loadAllData()
      } else {
        alert(data.error || "Failed to update wallet balance")
      }
    } catch (err: any) {
      alert(err.message || "Error adjusting wallet")
    } finally {
      setIsAdjustingWallet(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // =========================================================================
  // AUTHENTICATION SCREEN
  // =========================================================================
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex items-center justify-center p-4 selection:bg-indigo-500/30">
        <div className="w-full max-w-md">
          <div className="bg-[#10121a] border border-[#1e2233] rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  noBrain HQ
                  <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                    Control Console
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">Master Operations & AI Infrastructure</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Admin Master Passkey
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    placeholder="Enter 16-character passkey"
                    className="w-full px-4 py-3 bg-[#151824] border border-[#262b40] rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isAuthenticating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authenticate Console</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#1d2133] flex items-center justify-between text-[11px] text-zinc-500">
              <span>Protected Session • 30-day Auth</span>
              <span className="font-mono text-zinc-600">v1.5</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // MAIN ADMIN CONSOLE
  // =========================================================================
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  const openRouterKey = editedValues["OPENROUTER_API_KEY"] || ""

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0e1017]/90 backdrop-blur-md border-b border-[#1b1f2e] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">noBrain HQ</span>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Operations
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Master Platform Command & AI Controls</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {stats?.dbStatus && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141724] border border-[#202538] text-[11px] text-zinc-400 font-mono">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>DB {stats.dbLatencyMs}ms</span>
            </div>
          )}

          <button
            onClick={loadAllData}
            title="Refresh Platform State"
            className="p-2 rounded-xl bg-[#141724] border border-[#202538] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            title="Logout from HQ"
            className="p-2 rounded-xl bg-[#141724] border border-[#202538] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div className="border-b border-[#1b1f2e] bg-[#0c0e14] px-4 sm:px-8">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 custom-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "models", label: "AI & Models", icon: Sparkles, count: models.length },
            { id: "pricing", label: "Pricing & Billing", icon: Coins },
            { id: "users", label: "Users & Wallets", icon: Users, count: users.length },
            { id: "gateways", label: "Integrations & EPS", icon: Puzzle },
            { id: "smtp", label: "Mail & SMTP", icon: Mail },
            { id: "registry", label: "Raw Registry", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#141724] border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isActive ? "bg-indigo-500/20 text-indigo-200" : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Global Alerts */}
      {saveSuccessMessage && (
        <div className="mx-4 sm:mx-8 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage("")} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="mx-4 sm:mx-8 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{saveErrorMessage}</span>
          </div>
          <button onClick={() => setSaveErrorMessage("")} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stat Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Users",
                  value: stats?.totalUsers ?? users.length,
                  icon: Users,
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                  border: "border-blue-500/20",
                },
                {
                  label: "Active Copilot Bots",
                  value: stats?.totalBots ?? 0,
                  icon: BrainCircuit,
                  color: "text-purple-400",
                  bg: "bg-purple-500/10",
                  border: "border-purple-500/20",
                },
                {
                  label: "Configured AI Models",
                  value: models.length,
                  icon: Sparkles,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/20",
                },
                {
                  label: "User Float Balance",
                  value: `৳${(stats?.totalWalletBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                  icon: Coins,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10",
                  border: "border-emerald-500/20",
                },
              ].map((s, idx) => {
                const Icon = s.icon
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#11131c] border border-[#1e2233] relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-zinc-400">{s.label}</span>
                      <div className={`w-8 h-8 rounded-xl ${s.bg} ${s.border} border flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
                  </div>
                )
              })}
            </div>

            {/* Quick Live Diagnostics */}
            <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Infrastructure & Service Diagnostics
                  </h3>
                  <p className="text-xs text-zinc-400">Perform live round-trip latency & health checks</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: "database", name: "MySQL Database", desc: "Local state & tables" },
                  { id: "openrouter", name: "OpenRouter Gateway", desc: "External LLM models" },
                  { id: "bedrock", name: "AWS Bedrock", desc: "noBrain 1.5 core LLM" },
                  { id: "smtp", name: "Amazon SMTP", desc: "Transactional email" },
                ].map((srv) => {
                  const test = testResults[srv.id]
                  return (
                    <div
                      key={srv.id}
                      className="p-4 rounded-xl bg-[#151824] border border-[#202538] flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{srv.name}</span>
                          {test?.success === true && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3 h-3" />
                              {test.latencyMs}ms
                            </span>
                          )}
                          {test?.success === false && (
                            <span className="text-[10px] text-rose-400 flex items-center gap-1 font-mono">
                              <XCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{srv.desc}</p>
                        {test?.message && (
                          <p className={`text-[11px] mt-2 line-clamp-2 ${test.success ? "text-emerald-400/90" : "text-rose-400"}`}>
                            {test.message}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleRunServiceTest(srv.id)}
                        disabled={test?.loading}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#1c2133] hover:bg-[#252b42] text-xs font-medium text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {test?.loading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Ping Service</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Platform Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-[#11131c] border border-[#1e2233] space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Primary Identity & Domains
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1b1f2e]">
                    <span className="text-zinc-400">Platform Identity:</span>
                    <span className="font-semibold text-white">noBrain 1.5</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1b1f2e]">
                    <span className="text-zinc-400">Primary Model:</span>
                    <span className="font-mono text-indigo-300">
                      {editedValues["AWS_BEDROCK_MODEL_ID"] || "openai.gpt-oss-120b-1:0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-zinc-400">Vision Engine:</span>
                    <span className="font-mono text-purple-300">
                      {editedValues["VISION_BEDROCK_MODEL_ID"] || "amazon.nova-pro-v1:0"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#11131c] border border-[#1e2233] space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Default Rates & Prepaid Policy
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1b1f2e]">
                    <span className="text-zinc-400">Default Input Rate:</span>
                    <span className="font-mono text-emerald-300">
                      BDT {editedValues["PLATFORM_INPUT_PER_MILLION_PRICE"] || "60"} / 1M tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1b1f2e]">
                    <span className="text-zinc-400">Default Output Rate:</span>
                    <span className="font-mono text-emerald-300">
                      BDT {editedValues["PLATFORM_OUTPUT_PER_MILLION_PRICE"] || "110"} / 1M tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-zinc-400">Prepaid Policy:</span>
                    <span className="text-zinc-300">
                      {editedValues["PLATFORM_PREPAID_ONLY"] === "true" ? "Enforced (Positive Balance Required)" : "Postpaid Allowed"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: AI & MODELS (OPENROUTER & PLATFORM MODELS) */}
        {/* ================================================================= */}
        {activeTab === "models" && (
          <div className="space-y-6">
            {/* OpenRouter Integration Header Card */}
            <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      OpenRouter AI Integration Gateway
                      {openRouterKey ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          Configured
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          Key Needed
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Connect your OpenRouter account to unlock 400+ frontier & open-source language models.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunServiceTest("openrouter")}
                    disabled={testResults["openrouter"]?.loading}
                    className="px-3.5 py-2 rounded-xl bg-[#181c2b] hover:bg-[#20263b] border border-[#262c42] text-xs font-medium text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testResults["openrouter"]?.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>Test API Key</span>
                  </button>

                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* API Key Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    OpenRouter API Key (OPENROUTER_API_KEY)
                  </label>
                  <div className="relative">
                    <input
                      type={revealedSecrets["OPENROUTER_API_KEY"] ? "text" : "password"}
                      value={editedValues["OPENROUTER_API_KEY"] || ""}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, OPENROUTER_API_KEY: e.target.value }))
                      }
                      placeholder="sk-or-v1-..."
                      className="w-full px-3.5 py-2.5 bg-[#151824] border border-[#24293d] rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSecrets((prev) => ({
                          ...prev,
                          OPENROUTER_API_KEY: !prev["OPENROUTER_API_KEY"],
                        }))
                      }
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                    >
                      {revealedSecrets["OPENROUTER_API_KEY"] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleSaveConfigs}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save API Key</span>
                  </button>
                </div>
              </div>

              {testResults["openrouter"] && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResults["openrouter"].success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {testResults["openrouter"].success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="flex-1">{testResults["openrouter"].message}</span>
                  {testResults["openrouter"].latencyMs && (
                    <span className="font-mono text-[11px] opacity-80">
                      {testResults["openrouter"].latencyMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Configured Models Grid */}
            <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Configured Platform Models
                  </h3>
                  <p className="text-xs text-zinc-400">
                    These models appear directly in the user model switcher and Copilot agent creator.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenModelModal()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Include New Model</span>
                </button>
              </div>

              {/* Model Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {models.map((m) => {
                  const isCore = m.id === "nobrain-1.5"
                  return (
                    <div
                      key={m.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        m.isActive
                          ? "bg-[#141724] border-[#22283d] hover:border-indigo-500/40"
                          : "bg-[#11131b]/60 border-[#1a1e2e] opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{m.name}</span>
                            {m.isDefault && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                                Default
                              </span>
                            )}
                            {m.provider === "builtin" ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                                Native
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                                OpenRouter
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-zinc-400 block mt-0.5">{m.id}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleModelActive(m)}
                            title={m.isActive ? "Deactivate model" : "Activate model"}
                            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {m.isActive ? (
                              <ToggleRight className="w-6 h-6 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-zinc-600" />
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenModelModal(m)}
                            title="Edit model"
                            className="p-1.5 rounded-lg bg-[#1a1f30] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isCore && (
                            <button
                              onClick={() => handleDeleteModel(m.id)}
                              title="Delete model"
                              className="p-1.5 rounded-lg bg-[#1a1f30] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {m.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{m.description}</p>
                      )}

                      {/* Capabilities Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                            m.inputText
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-600 line-through"
                          }`}
                        >
                          In: Text
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                            m.inputImage
                              ? "bg-sky-500/15 text-sky-300 border border-sky-500/20"
                              : "bg-zinc-800 text-zinc-600 line-through"
                          }`}
                        >
                          In: Image (Vision)
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                            m.outputText
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                              : "bg-zinc-800 text-zinc-600 line-through"
                          }`}
                        >
                          Out: Text
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                            m.outputImage
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                              : "bg-zinc-800 text-zinc-600 line-through"
                          }`}
                        >
                          Out: Image
                        </span>
                      </div>

                      {/* Token Pricing Info */}
                      <div className="pt-2.5 border-t border-[#1d2235] flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Usage Rates:</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-zinc-300">In: ৳{m.inputPricePerMillion}/1M</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-300">Out: ৳{m.outputPricePerMillion}/1M</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: PRICING & BILLING */}
        {/* ================================================================= */}
        {activeTab === "pricing" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    Token Pricing & Wallet Policy
                  </h3>
                  <p className="text-xs text-zinc-400">Configure global billing and wallet constraints</p>
                </div>
                <button
                  onClick={handleSaveConfigs}
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Pricing</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#151824] border border-[#202538] space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Default Input Rate (BDT per 1M tokens)
                  </label>
                  <input
                    type="number"
                    value={editedValues["PLATFORM_INPUT_PER_MILLION_PRICE"] || "60"}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, PLATFORM_INPUT_PER_MILLION_PRICE: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0c0d12] border border-[#23283d] rounded-lg text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-zinc-500">Charged per 1,000,000 prompt tokens</p>
                </div>

                <div className="p-4 rounded-xl bg-[#151824] border border-[#202538] space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Default Output Rate (BDT per 1M tokens)
                  </label>
                  <input
                    type="number"
                    value={editedValues["PLATFORM_OUTPUT_PER_MILLION_PRICE"] || "110"}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, PLATFORM_OUTPUT_PER_MILLION_PRICE: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0c0d12] border border-[#23283d] rounded-lg text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-zinc-500">Charged per 1,000,000 generated tokens</p>
                </div>

                <div className="p-4 rounded-xl bg-[#151824] border border-[#202538] space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Minimum Recharge Amount (BDT)
                  </label>
                  <input
                    type="number"
                    value={editedValues["PLATFORM_MINIMUM_RECHARGE_AMOUNT"] || "500"}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, PLATFORM_MINIMUM_RECHARGE_AMOUNT: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0c0d12] border border-[#23283d] rounded-lg text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-zinc-500">Floor threshold for wallet top-up</p>
                </div>
              </div>

              {/* Prepaid Policy Toggle */}
              <div className="p-4 rounded-xl bg-[#151824] border border-[#202538] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Prepaid-Only Mode</span>
                  <span className="text-[11px] text-zinc-400">
                    Require positive wallet balance before processing chat turns & agent workflows
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditedValues((prev) => ({
                      ...prev,
                      PLATFORM_PREPAID_ONLY: prev["PLATFORM_PREPAID_ONLY"] === "true" ? "false" : "true",
                    }))
                  }
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {editedValues["PLATFORM_PREPAID_ONLY"] === "true" ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-zinc-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: USERS & WALLETS */}
        {/* ================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    User Directory & Wallet Balances
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Search and manage registered accounts, balances, and manual credits/debits
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search name or email..."
                    className="w-full sm:w-64 px-3.5 py-1.5 bg-[#151824] border border-[#24293d] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 pl-8"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151824] border-y border-[#202538] text-zinc-400">
                    <tr>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Wallet Balance</th>
                      <th className="py-2.5 px-3">Last Model</th>
                      <th className="py-2.5 px-3">Joined</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1f2e]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#141724]/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">{u.name}</td>
                        <td className="py-3 px-3 font-mono text-zinc-300">{u.email}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                          ৳{Number(u.wallet_balance || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                          {u.last_used_model || "nobrain-1.5"}
                        </td>
                        <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setAdjustingUser(u)
                              setAdjustAmount("100")
                              setAdjustType("credit")
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Adjust Balance
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: GATEWAYS & INTEGRATIONS */}
        {/* ================================================================= */}
        {activeTab === "gateways" && (
          <div className="space-y-6">
            {/* EPS Payment Gateway */}
            <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      EPS Payment Gateway
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        bKash / Nagad / Cards
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">Automated instant payment top-up for Bangladesh</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunServiceTest("eps")}
                    disabled={testResults["eps"]?.loading}
                    className="px-3.5 py-2 rounded-xl bg-[#181c2b] hover:bg-[#20263b] border border-[#262c42] text-xs font-medium text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testResults["eps"]?.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Verify Gateway</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Merchant ID</label>
                  <input
                    type="password"
                    value={editedValues["PLATFORM_EPS_MERCHANT_ID"] || ""}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, PLATFORM_EPS_MERCHANT_ID: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Store ID</label>
                  <input
                    type="password"
                    value={editedValues["PLATFORM_EPS_STORE_ID"] || ""}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, PLATFORM_EPS_STORE_ID: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Sandbox Mode</label>
                  <select
                    value={editedValues["PLATFORM_EPS_SANDBOX"] || "false"}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, PLATFORM_EPS_SANDBOX: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white cursor-pointer"
                  >
                    <option value="false">Live Production</option>
                    <option value="true">Sandbox Testing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Google Integrations */}
            <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Puzzle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google OAuth, Drive & Gmail Integration</h3>
                  <p className="text-xs text-zinc-400">Powers Copilot autonomous workspace agents</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Google Client ID</label>
                  <input
                    type="text"
                    value={editedValues["GOOGLE_CLIENT_ID"] || ""}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, GOOGLE_CLIENT_ID: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Google Client Secret</label>
                  <input
                    type="password"
                    value={editedValues["GOOGLE_CLIENT_SECRET"] || ""}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, GOOGLE_CLIENT_SECRET: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveConfigs}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Gateway Credentials</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: MAIL & SMTP */}
        {/* ================================================================= */}
        {activeTab === "smtp" && (
          <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">SMTP Mail Server</h3>
                  <p className="text-xs text-zinc-400">Transactional account verification & password reset emails</p>
                </div>
              </div>

              <button
                onClick={() => handleRunServiceTest("smtp")}
                disabled={testResults["smtp"]?.loading}
                className="px-3.5 py-2 rounded-xl bg-[#181c2b] hover:bg-[#20263b] border border-[#262c42] text-xs font-medium text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testResults["smtp"]?.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Test SMTP Connection</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">SMTP Host</label>
                <input
                  type="text"
                  value={editedValues["MAIL_HOST"] || ""}
                  onChange={(e) => setEditedValues((prev) => ({ ...prev, MAIL_HOST: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Port</label>
                <input
                  type="number"
                  value={editedValues["MAIL_PORT"] || "587"}
                  onChange={(e) => setEditedValues((prev) => ({ ...prev, MAIL_PORT: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Sender Address</label>
                <input
                  type="text"
                  value={editedValues["MAIL_FROM_ADDRESS"] || ""}
                  onChange={(e) => setEditedValues((prev) => ({ ...prev, MAIL_FROM_ADDRESS: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white"
                />
              </div>
            </div>

            <button
              onClick={handleSaveConfigs}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save SMTP Settings</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: RAW REGISTRY */}
        {/* ================================================================= */}
        {activeTab === "registry" && (
          <div className="rounded-2xl bg-[#11131c] border border-[#1e2233] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Configuration Key Registry
                </h3>
                <p className="text-xs text-zinc-400">Direct low-level database variables</p>
              </div>

              <button
                onClick={handleSaveConfigs}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Registry</span>
              </button>
            </div>

            <div className="space-y-3">
              {configs.map((c) => {
                const isSecret = Boolean(c.is_secret)
                const isRevealed = Boolean(revealedSecrets[c.key])
                return (
                  <div
                    key={c.key}
                    className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 md:w-1/3">
                      <span className="text-xs font-mono font-semibold text-white block truncate">{c.key}</span>
                      <span className="text-[11px] text-zinc-400 line-clamp-1">{c.description}</span>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type={isSecret && !isRevealed ? "password" : "text"}
                        value={editedValues[c.key] ?? c.value}
                        onChange={(e) =>
                          setEditedValues((prev) => ({ ...prev, [c.key]: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />

                      {isSecret && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedSecrets((prev) => ({
                              ...prev,
                              [c.key]: !prev[c.key],
                            }))
                          }
                          className="p-2 rounded-lg bg-[#1e2335] text-zinc-400 hover:text-white"
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* ADD / EDIT MODEL MODAL */}
      {/* =================================================================== */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#11131c] border border-[#23283d] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-[#1d2235] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingModel ? "Edit AI Model" : "Include OpenRouter / AI Model"}
                  </h3>
                  <p className="text-xs text-zinc-400">Configure model capabilities & token billing</p>
                </div>
              </div>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick OpenRouter Lookup Input */}
            {!editingModel && (
              <div className="relative">
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Search & Auto-fill from OpenRouter Catalogue
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => handleSearchOpenRouter(e.target.value)}
                    placeholder="Search e.g. claude-3.5, gpt-4o, llama-3.3..."
                    className="w-full px-3.5 py-2 bg-[#161a29] border border-[#24293d] rounded-xl text-xs text-white placeholder-zinc-500 pl-8 focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3" />
                  {isSearchingOpenRouter && (
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-3 top-3" />
                  )}
                </div>

                {openRouterSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-[#161a29] border border-[#262d45] rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar z-20 divide-y divide-[#1e2438]">
                    {openRouterSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectOpenRouterSuggestion(s)}
                        className="w-full text-left p-2.5 hover:bg-[#1f253a] transition-colors cursor-pointer flex flex-col"
                      >
                        <span className="text-xs font-semibold text-white">{s.name}</span>
                        <span className="text-[11px] font-mono text-indigo-300">{s.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSaveModel} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Model ID / Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={modelFormId}
                    onChange={(e) => setModelFormId(e.target.value)}
                    placeholder="e.g. anthropic/claude-3.5-sonnet"
                    className="w-full px-3 py-2 bg-[#151824] border border-[#23283d] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Display Name (User Facing) *
                  </label>
                  <input
                    type="text"
                    required
                    value={modelFormName}
                    onChange={(e) => setModelFormName(e.target.value)}
                    placeholder="e.g. Claude 3.5 Sonnet"
                    className="w-full px-3 py-2 bg-[#151824] border border-[#23283d] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Description</label>
                <input
                  type="text"
                  value={modelFormDesc}
                  onChange={(e) => setModelFormDesc(e.target.value)}
                  placeholder="Short description of intelligence & domain specialization"
                  className="w-full px-3 py-2 bg-[#151824] border border-[#23283d] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Capabilities Checkboxes */}
              <div className="p-4 rounded-2xl bg-[#151824] border border-[#202538] space-y-3">
                <span className="text-xs font-bold text-white block uppercase tracking-wider">
                  Model Capabilities (Inputs & Outputs)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#191d2e] border border-[#262c42] cursor-pointer hover:border-indigo-500/40">
                    <input
                      type="checkbox"
                      checked={modelFormInputText}
                      onChange={(e) => setModelFormInputText(e.target.checked)}
                      className="rounded bg-[#0c0d12] border-zinc-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-zinc-200">Input Text</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#191d2e] border border-[#262c42] cursor-pointer hover:border-indigo-500/40">
                    <input
                      type="checkbox"
                      checked={modelFormInputImage}
                      onChange={(e) => setModelFormInputImage(e.target.checked)}
                      className="rounded bg-[#0c0d12] border-zinc-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-zinc-200">Input Image</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#191d2e] border border-[#262c42] cursor-pointer hover:border-indigo-500/40">
                    <input
                      type="checkbox"
                      checked={modelFormOutputText}
                      onChange={(e) => setModelFormOutputText(e.target.checked)}
                      className="rounded bg-[#0c0d12] border-zinc-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-zinc-200">Output Text</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#191d2e] border border-[#262c42] cursor-pointer hover:border-indigo-500/40">
                    <input
                      type="checkbox"
                      checked={modelFormOutputImage}
                      onChange={(e) => setModelFormOutputImage(e.target.checked)}
                      className="rounded bg-[#0c0d12] border-zinc-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-zinc-200">Output Image</span>
                  </label>
                </div>
              </div>

              {/* Pricing in BDT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Input Cost (BDT / 1M tokens)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={modelFormInputPrice}
                    onChange={(e) => setModelFormInputPrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#151824] border border-[#202538] space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Output Cost (BDT / 1M tokens)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={modelFormOutputPrice}
                    onChange={(e) => setModelFormOutputPrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0c0d12] border border-[#23283d] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Active & Default toggles */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modelFormIsActive}
                    onChange={(e) => setModelFormIsActive(e.target.checked)}
                    className="rounded bg-[#0c0d12] border-zinc-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-white">Active (Visible to users)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modelFormIsDefault}
                    onChange={(e) => setModelFormIsDefault(e.target.checked)}
                    className="rounded bg-[#0c0d12] border-zinc-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-white">Set as Platform Default</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1d2235]">
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#161926] text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  Save Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* WALLET ADJUSTMENT MODAL */}
      {/* =================================================================== */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#11131c] border border-[#23283d] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1d2235] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Adjust User Wallet</h3>
                <p className="text-xs text-zinc-400">{adjustingUser.name} ({adjustingUser.email})</p>
              </div>
              <button onClick={() => setAdjustingUser(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAdjustWalletSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("credit")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      adjustType === "credit"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-[#151824] border-[#22273d] text-zinc-400"
                    }`}
                  >
                    Credit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("debit")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      adjustType === "debit"
                        ? "bg-rose-500/20 border-rose-500 text-rose-300"
                        : "bg-[#151824] border-[#22273d] text-zinc-400"
                    }`}
                  >
                    Debit (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151824] border border-[#23283d] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="w-full px-3 py-2 bg-[#151824] border border-[#23283d] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1d2235]">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#161926] text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingWallet}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isAdjustingWallet ? "Updating..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
