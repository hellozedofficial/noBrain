"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Copy, Check, Plus, Trash2, Globe, ShieldCheck, Eye, EyeOff, Key, ExternalLink, Loader2, AlertCircle } from "lucide-react"

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
    <div style={pageStyle}>
      {/* Nav */}
      <nav style={navStyle}>
        <span style={logoStyle}>noBrain Developer</span>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <a href="/" style={navLink}>← Dashboard</a>
          <a href="/api/docs" target="_blank" rel="noreferrer" style={{ ...navLink, display: "flex", alignItems: "center", gap: "4px" }}>
            API Docs <ExternalLink size={13} />
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 20px" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "30px", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>API Keys</h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>
              Manage your API keys. Keys are tied to your wallet balance.
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); setNewKeyValue(null) }}
            style={primaryBtn}
          >
            <Plus size={16} /> New API Key
          </button>
        </div>

        {/* New key created banner */}
        {newKeyValue && (
          <div style={successBanner}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Key size={16} color="#4ade80" />
              <strong style={{ color: "#4ade80" }}>API Key Created!</strong>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>Copy it now — it won't be shown again.</span>
            </div>
            <div style={keyDisplay}>
              <code style={{ flex: 1, wordBreak: "break-all", fontSize: "13.5px", color: "#a78bfa" }}>{newKeyValue}</code>
              <button
                onClick={() => copyToClipboard(newKeyValue, "new")}
                style={iconBtn}
                title="Copy"
              >
                {copiedId === "new" ? <Check size={15} color="#4ade80" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Create key form */}
        {showCreate && (
          <form onSubmit={handleCreate} style={card}>
            <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>Create New API Key</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Key Name <span style={{ color: "#f87171" }}>*</span></label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production App"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  <Globe size={13} style={{ display: "inline", marginRight: "5px" }} />
                  Domain Allowlist
                  <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: "6px", fontSize: "12px" }}>
                    (optional — leave blank to allow all origins)
                  </span>
                </label>
                <input
                  value={newDomains}
                  onChange={(e) => setNewDomains(e.target.value)}
                  placeholder="e.g. myapp.com, *.myapp.com, localhost"
                  style={inputStyle}
                />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "5px" }}>
                  Comma-separated. Wildcards supported: *.example.com
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" disabled={creating} style={primaryBtn}>
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  {creating ? "Creating..." : "Create Key"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} style={ghostBtn}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Error state */}
        {error && (
          <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center", color: "#fca5a5", fontSize: "14px" }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Keys list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.35)" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px" }}>Loading keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "48px", color: "rgba(255,255,255,0.35)" }}>
            <Key size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p>No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {keys.map((k) => (
              <div key={k.id} style={{ ...card, opacity: k.is_active ? 1 : 0.55 }}>
                {/* Key header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Key size={16} color="#a78bfa" />
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: "15px" }}>{k.name}</span>
                    {!k.is_active && (
                      <span style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>REVOKED</span>
                    )}
                  </div>
                  {k.is_active && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      style={{ ...ghostBtn, color: "#f87171", borderColor: "rgba(248,113,113,0.25)", padding: "5px 10px", fontSize: "12px" }}
                    >
                      {revokingId === k.id ? <Loader2 size={12} /> : <Trash2 size={12} />}
                      Revoke
                    </button>
                  )}
                </div>

                {/* Masked key value */}
                <div style={{ ...keyDisplay, marginBottom: "12px" }}>
                  <code style={{ flex: 1, fontSize: "13px", color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em" }}>
                    {k.key}
                  </code>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <Stat label="Requests" value={k.usage_count.toLocaleString()} />
                  <Stat label="Last used" value={k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"} />
                  <Stat label="Created" value={new Date(k.created_at).toLocaleDateString()} />
                </div>

                {/* Domain allowlist */}
                {k.is_active && (
                  <div>
                    {editingId === k.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={labelStyle}><Globe size={12} style={{ display: "inline" }} /> Allowed Domains</label>
                        <input
                          value={editDomains}
                          onChange={(e) => setEditDomains(e.target.value)}
                          placeholder="domain1.com, *.domain2.com (blank = allow all)"
                          style={inputStyle}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleSaveDomains(k.id)}
                            disabled={savingId === k.id}
                            style={{ ...primaryBtn, fontSize: "12px", padding: "6px 14px" }}
                          >
                            {savingId === k.id ? <Loader2 size={12} /> : <Check size={12} />}
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ ...ghostBtn, fontSize: "12px", padding: "6px 12px" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <ShieldCheck size={14} color={k.domain_allowlist ? "#4ade80" : "rgba(255,255,255,0.3)"} />
                        {k.domain_allowlist ? (
                          <span style={{ fontSize: "13px", color: "#4ade80" }}>
                            Restricted to: {k.domain_allowlist}
                          </span>
                        ) : (
                          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
                            No domain restriction (all origins allowed)
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(k.id)
                            setEditDomains(k.domain_allowlist ?? "")
                          }}
                          style={{ ...ghostBtn, fontSize: "12px", padding: "4px 10px" }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", textAlign: "center", marginTop: "40px" }}>
          API usage is deducted from your wallet balance. Max 10 active keys per account.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)",
  minHeight: "100vh",
}

const navStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  padding: "14px 28px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  position: "sticky",
  top: 0,
  zIndex: 50,
}

const logoStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
}

const navLink: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  textDecoration: "none",
  fontSize: "13.5px",
  fontWeight: 500,
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "14px",
  padding: "22px",
}

const keyDisplay: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontFamily: "monospace",
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "9px 18px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
}

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "transparent",
  color: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "7px 14px",
  fontSize: "13px",
  cursor: "pointer",
}

const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.4)",
  cursor: "pointer",
  padding: "4px",
  flexShrink: 0,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "10px 14px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.55)",
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "6px",
}

const successBanner: React.CSSProperties = {
  background: "rgba(74,222,128,0.07)",
  border: "1px solid rgba(74,222,128,0.2)",
  borderRadius: "12px",
  padding: "18px",
  marginBottom: "20px",
}
