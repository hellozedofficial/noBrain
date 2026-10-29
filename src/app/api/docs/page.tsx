"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Copy, Check, BookOpen, MessageSquare, Image, Shield, Zap, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

// ── Multi-language code examples data ───────────────────────────────────────

const CHAT_EXAMPLES = [
  {
    lang: "cURL",
    icon: "⚡",
    id: "chat-curl",
    code: `curl -X POST https://ai.saleonic.com/api/v1/chat \\
  -H "Authorization: Bearer nbr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What is artificial intelligence?",
    "system_prompt": "You are an expert researcher."
  }'`,
  },
  {
    lang: "JavaScript",
    icon: "🟨",
    id: "chat-js",
    code: `const response = await fetch("https://ai.saleonic.com/api/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer nbr_YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: "What is artificial intelligence?",
    history: [],                                   // Optional
    system_prompt: "You are an expert researcher." // Optional
  })
});

const data = await response.json();
if (data.success) {
  console.log("AI Response:", data.response);
  console.log("Tokens used:", data.usage);
} else {
  console.error("Error:", data.error);
}`,
  },
  {
    lang: "Python",
    icon: "🐍",
    id: "chat-py",
    code: `import requests

url = "https://ai.saleonic.com/api/v1/chat"
headers = {
    "Authorization": "Bearer nbr_YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "message": "What is artificial intelligence?",
    "history": [],                                    # Optional
    "system_prompt": "You are an expert researcher."  # Optional
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if data["success"]:
    print("AI Response:", data["response"])
    print("Input tokens:", data["usage"]["input_tokens"])
    print("Output tokens:", data["usage"]["output_tokens"])
else:
    print("Error:", data["error"])`,
  },
]

const CANVAS_EXAMPLES = [
  {
    lang: "cURL",
    icon: "⚡",
    id: "canvas-curl",
    code: `curl -X POST https://ai.saleonic.com/api/v1/canvas \\
  -H "Authorization: Bearer nbr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "prompt": "High quality, sharp and detailed upscale"
  }'`,
  },
  {
    lang: "JavaScript",
    icon: "🟨",
    id: "canvas-js",
    code: `const response = await fetch("https://ai.saleonic.com/api/v1/canvas", {
  method: "POST",
  headers: {
    "Authorization": "Bearer nbr_YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    image_url: "https://example.com/photo.jpg",
    prompt: "High quality, sharp and detailed upscale" // Optional
  })
});

const data = await response.json();
if (data.success) {
  console.log("Upscaled URL:", data.image_url);
  console.log("Model used:", data.model);
} else {
  console.error("Error:", data.error);
}`,
  },
  {
    lang: "Python",
    icon: "🐍",
    id: "canvas-py",
    code: `import requests

url = "https://ai.saleonic.com/api/v1/canvas"
headers = {
    "Authorization": "Bearer nbr_YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "image_url": "https://example.com/photo.jpg",
    "prompt": "High quality, sharp and detailed upscale"  # Optional
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if data["success"]:
    print("Upscaled image URL:", data["image_url"])
    print("Model:", data["model"])
else:
    print("Error:", data["error"])`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "canvas">("chat")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [chatLang, setChatLang] = useState(0)
  const [canvasLang, setCanvasLang] = useState(0)

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#ececec]">
      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-6 bg-[#111] border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-semibold text-[#ececec] hover:text-white transition-colors no-underline">
            noBrain
          </Link>
          <span className="text-[#333]">/</span>
          <span className="text-sm text-[#888] flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> API Docs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/developer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#888] hover:text-[#ececec] hover:bg-[#1a1a1a] rounded-lg transition-colors no-underline"
          >
            Developer Dashboard
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-medium text-[#ececec] bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] rounded-lg transition-colors no-underline"
          >
            ← Back to Chat
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-5 py-10">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-4">
            <Zap className="h-3 w-3" /> noBrain Public API
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">API Documentation</h1>
          <p className="text-[#888] text-base leading-relaxed max-w-2xl">
            Integrate noBrain 1.5 into your apps. Simple REST API with JSON — no SDK required.
          </p>
        </div>

        {/* ── Auth callout ──────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/8 border border-purple-500/20 mb-8">
          <Shield className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-sm text-[#aaa] leading-relaxed">
            <span className="text-purple-300 font-medium">Authentication Required — </span>
            Include your API key as{" "}
            <code className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-purple-300 text-xs font-mono">
              Authorization: Bearer nbr_YOUR_KEY
            </code>{" "}
            in every request.{" "}
            <Link href="/developer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
              Get your API key →
            </Link>
          </div>
        </div>

        {/* ── API Tab switcher ──────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-[#141414] border border-[#1f1f1f] rounded-xl mb-8 w-fit">
          {([
            { id: "chat", label: "Chat API", icon: MessageSquare },
            { id: "canvas", label: "Canvas API", icon: Image },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-[#1f1f1f] text-white shadow-sm"
                  : "text-[#666] hover:text-[#aaa]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── CHAT API ──────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <Section title="Endpoint">
              <EndpointPill method="POST" url="https://ai.saleonic.com/api/v1/chat" onCopy={copy} copiedId={copiedId} />
            </Section>

            <Section title="Request Headers">
              <ParamTable rows={[
                { name: "Authorization", type: "string", required: true, desc: 'Bearer nbr_YOUR_API_KEY' },
                { name: "Content-Type", type: "string", required: true, desc: "application/json" },
                { name: "Origin", type: "string", required: false, desc: "Your domain — required if the key has a domain allowlist" },
              ]} />
            </Section>

            <Section title="Request Body">
              <ParamTable rows={[
                { name: "message", type: "string", required: true, desc: "The user's message" },
                { name: "history", type: "array", required: false, desc: 'Previous messages [{role: "user"|"assistant", content: "..."}]' },
                { name: "system_prompt", type: "string", required: false, desc: "Custom system prompt to define AI behavior" },
              ]} />
            </Section>

            <Section title="Response">
              <ParamTable noRequired rows={[
                { name: "success", type: "boolean", desc: "true on success" },
                { name: "response", type: "string", desc: "The AI's reply" },
                { name: "model", type: "string", desc: "Model used (nobrain-1.5)" },
                { name: "usage.input_tokens", type: "integer", desc: "Tokens consumed from prompt" },
                { name: "usage.output_tokens", type: "integer", desc: "Tokens in the AI response" },
              ]} />
            </Section>

            {/* Code examples with language switcher */}
            <Section title="Code Examples">
              <MultiLangCodeBlock
                examples={CHAT_EXAMPLES}
                activeLang={chatLang}
                onLangChange={setChatLang}
                copiedId={copiedId}
                onCopy={copy}
              />
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section title="Success Response">
                <CodeBlock id="chat-ok" label="JSON" copiedId={copiedId} onCopy={copy} code={`{
  "success": true,
  "response": "Artificial intelligence (AI) is...",
  "model": "nobrain-1.5",
  "usage": {
    "input_tokens": 245,
    "output_tokens": 512
  }
}`} />
              </Section>
              <Section title="Error Response">
                <CodeBlock id="chat-err" label="JSON" copiedId={copiedId} onCopy={copy} code={`{
  "success": false,
  "error": "Insufficient quota. Please recharge your wallet."
}`} />
              </Section>
            </div>
          </div>
        )}

        {/* ── CANVAS API ────────────────────────────────────────────── */}
        {activeTab === "canvas" && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/8 border border-blue-500/20">
              <Image className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-[#aaa]">
                Fast image upscaling powered by{" "}
                <code className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-blue-300 text-xs font-mono">
                  stability.stable-fast-upscale-v1:0
                </code>{" "}
                on Amazon Bedrock. Submit an image URL and receive a high-quality upscaled result.
              </p>
            </div>

            <Section title="Endpoint">
              <EndpointPill method="POST" url="https://ai.saleonic.com/api/v1/canvas" onCopy={copy} copiedId={copiedId} />
            </Section>

            <Section title="Request Body">
              <ParamTable rows={[
                { name: "image_url", type: "string", required: true, desc: "Public URL of the input image (JPEG, PNG, WebP, GIF)" },
                { name: "prompt", type: "string", required: false, desc: "Optional text prompt to guide upscaling quality" },
              ]} />
            </Section>

            <Section title="Response">
              <ParamTable noRequired rows={[
                { name: "success", type: "boolean", desc: "true on success" },
                { name: "image_url", type: "string", desc: "CDN URL of the upscaled result image" },
                { name: "images", type: "array", desc: "Base64-encoded upscaled image strings" },
                { name: "model", type: "string", desc: "stability.stable-fast-upscale-v1:0" },
              ]} />
            </Section>

            {/* Code examples with language switcher */}
            <Section title="Code Examples">
              <MultiLangCodeBlock
                examples={CANVAS_EXAMPLES}
                activeLang={canvasLang}
                onLangChange={setCanvasLang}
                copiedId={copiedId}
                onCopy={copy}
              />
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section title="Success Response">
                <CodeBlock id="canvas-ok" label="JSON" copiedId={copiedId} onCopy={copy} code={`{
  "success": true,
  "image_url": "https://cdn.../canvas/result_abc.png",
  "images": ["iVBORw0KGgoAAAANSUhEUg..."],
  "model": "stability.stable-fast-upscale-v1:0"
}`} />
              </Section>
              <Section title="Error Response">
                <CodeBlock id="canvas-err" label="JSON" copiedId={copiedId} onCopy={copy} code={`{
  "success": false,
  "error": "image_url is required."
}`} />
              </Section>
            </div>
          </div>
        )}

        {/* ── Domain Protection ─────────────────────────────────────── */}
        <div className="mt-8 p-5 rounded-xl bg-[#141414] border border-[#1f1f1f]">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-semibold text-white">Domain Protection</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">OPTIONAL</span>
          </div>
          <p className="text-sm text-[#777] leading-relaxed mb-3">
            Restrict an API key to specific domains. Requests with an{" "}
            <code className="px-1 py-0.5 bg-[#1a1a1a] rounded text-[#aaa] text-xs font-mono">Origin</code>{" "}
            header not matching the allowlist will be blocked with a{" "}
            <code className="px-1 py-0.5 bg-[#1a1a1a] rounded text-[#aaa] text-xs font-mono">401</code>{" "}
            error. Keys without an allowlist accept requests from anywhere.
            Wildcards are supported: <code className="px-1 py-0.5 bg-[#1a1a1a] rounded text-purple-300 text-xs font-mono">*.example.com</code>
          </p>
          <Link href="/developer" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors no-underline">
            Configure domain allowlist in Developer Dashboard →
          </Link>
        </div>

        {/* ── Rate limits ───────────────────────────────────────────── */}
        <div className="mt-4 p-5 rounded-xl bg-[#141414] border border-[#1f1f1f]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            Rate Limits & Quota
          </h3>
          <p className="text-sm text-[#777] mb-4">Usage is deducted from your wallet balance. Ensure sufficient balance before making requests.</p>
          <div className="overflow-x-auto rounded-lg border border-[#1f1f1f]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#111]">
                  {["Plan", "Requests / Day", "Max Tokens / Request"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#555] border-b border-[#1f1f1f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[["Free", "100", "4,096"], ["Pro", "10,000", "4,096"], ["Enterprise", "Unlimited", "8,192"]].map(([plan, req, tok]) => (
                  <tr key={plan} className="border-b border-[#181818] last:border-0 hover:bg-[#111]">
                    <td className="px-4 py-2.5 text-[#ccc] font-medium">{plan}</td>
                    <td className="px-4 py-2.5 text-[#888]">{req}</td>
                    <td className="px-4 py-2.5 text-[#888]">{tok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MultiLangCodeBlock ───────────────────────────────────────────────────────

function MultiLangCodeBlock({
  examples,
  activeLang,
  onLangChange,
  copiedId,
  onCopy,
}: {
  examples: { lang: string; icon: string; id: string; code: string }[]
  activeLang: number
  onLangChange: (i: number) => void
  copiedId: string | null
  onCopy: (text: string, id: string) => void
}) {
  const active = examples[activeLang]
  return (
    <div className="rounded-xl border border-[#1f1f1f] overflow-hidden">
      {/* Language tabs + copy button */}
      <div className="flex items-center justify-between bg-[#111] border-b border-[#1f1f1f] px-1 py-1">
        <div className="flex">
          {examples.map((ex, i) => (
            <button
              key={ex.id}
              onClick={() => onLangChange(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeLang === i
                  ? "bg-[#1f1f1f] text-white"
                  : "text-[#555] hover:text-[#999]"
              )}
            >
              <span>{ex.icon}</span>
              {ex.lang}
            </button>
          ))}
        </div>
        <button
          onClick={() => onCopy(active.code, active.id)}
          className="flex items-center gap-1.5 mr-2 px-2.5 py-1.5 text-xs text-[#555] hover:text-[#999] hover:bg-[#1a1a1a] rounded-lg transition-colors"
        >
          {copiedId === active.id
            ? <><Check className="h-3 w-3 text-green-400" /><span className="text-green-400">Copied!</span></>
            : <><Copy className="h-3 w-3" />Copy</>
          }
        </button>
      </div>
      {/* Code */}
      <pre className="p-5 text-xs text-[#ccc] overflow-x-auto leading-relaxed font-mono bg-[#0a0a0a] m-0 min-h-[120px]">
        <code>{active.code}</code>
      </pre>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-2">{title}</h2>
      {children}
    </div>
  )
}

function EndpointPill({
  method, url, onCopy, copiedId,
}: {
  method: string; url: string
  onCopy: (text: string, id: string) => void
  copiedId: string | null
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#111] border border-[#1f1f1f] rounded-xl font-mono text-sm group">
      <span className="shrink-0 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-xs font-bold">{method}</span>
      <span className="text-[#888] flex-1 truncate">{url}</span>
      <button
        onClick={() => onCopy(url, "endpoint-" + url)}
        className="shrink-0 p-1.5 rounded-md text-[#444] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors opacity-0 group-hover:opacity-100"
      >
        {copiedId === "endpoint-" + url ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

function ParamTable({
  rows, noRequired,
}: {
  rows: { name: string; type: string; required?: boolean; desc: string }[]
  noRequired?: boolean
}) {
  return (
    <div className="rounded-xl border border-[#1f1f1f] overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#111]">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555] border-b border-[#1f1f1f]">Parameter</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555] border-b border-[#1f1f1f]">Type</th>
            {!noRequired && <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555] border-b border-[#1f1f1f]">Required</th>}
            <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555] border-b border-[#1f1f1f]">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-[#181818] last:border-0 hover:bg-[#0f0f0f]">
              <td className="px-4 py-2.5 font-mono text-purple-400 text-xs whitespace-nowrap">{row.name}</td>
              <td className="px-4 py-2.5 font-mono text-[#888] text-xs whitespace-nowrap">{row.type}</td>
              {!noRequired && (
                <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                  {row.required
                    ? <span className="text-red-400 font-medium">Required</span>
                    : <span className="text-[#555]">Optional</span>}
                </td>
              )}
              <td className="px-4 py-2.5 text-[#777] text-xs leading-relaxed">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeBlock({
  id, label, code, copiedId, onCopy,
}: {
  id: string; label: string; code: string
  copiedId: string | null
  onCopy: (text: string, id: string) => void
}) {
  return (
    <div className="rounded-xl border border-[#1f1f1f] overflow-hidden group">
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-[#1f1f1f]">
        <span className="text-xs font-medium text-[#555]">{label}</span>
        <button
          onClick={() => onCopy(code, id)}
          className="flex items-center gap-1.5 text-xs text-[#444] hover:text-[#888] transition-colors px-2 py-1 rounded-md hover:bg-[#1a1a1a]"
        >
          {copiedId === id ? <><Check className="h-3 w-3 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="h-3 w-3" />Copy</>}
        </button>
      </div>
      <pre className="p-4 text-xs text-[#ccc] overflow-x-auto leading-relaxed font-mono bg-[#0d0d0d] m-0">
        <code>{code}</code>
      </pre>
    </div>
  )
}
