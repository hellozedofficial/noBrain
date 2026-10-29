import { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "noBrain API Documentation",
  description: "Developer API for noBrain AI platform — Chat and Canvas endpoints",
}

export default function ApiDocsPage() {
  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)",
        minHeight: "100vh",
        padding: "0",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <span
          style={{
            fontSize: "22px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          noBrain API
        </span>
        <div style={{ display: "flex", gap: "24px" }}>
          {[
            { label: "Dashboard", href: "/" },
            { label: "Developer", href: "/developer" },
            { label: "API Docs", href: "/api/docs" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: "rgba(255,255,255,0.65)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "#a78bfa")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.65)")
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
        {/* Hero */}
        <div style={{ marginBottom: "48px" }}>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "12px",
            }}
          >
            noBrain API Docs
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "17px", lineHeight: 1.7 }}>
            Simple and powerful AI API powered by noBrain 1.5. Build chatbots,
            assistants, and image tools with just a few lines of code.
          </p>
        </div>

        {/* Auth callout */}
        <Callout icon="🔑" title="Authentication Required">
          All API requests must include a valid API key in the{" "}
          <code style={inlineCode}>Authorization</code> header.{" "}
          <a
            href="/developer"
            style={{ color: "#a78bfa", textDecoration: "underline" }}
          >
            Get your API key from the Developer Dashboard →
          </a>
        </Callout>

        {/* ── CHAT API ─────────────────────────────────────────────────── */}
        <Section id="chat" badge="POST" badgeColor="#7c3aed" title="Chat API">
          <p style={bodyText}>
            Send messages to noBrain 1.5 and receive AI-generated responses.
            Supports conversation history and custom system prompts.
          </p>

          <EndpointBadge method="POST" url="https://ai.saleonic.com/api/v1/chat" />

          <h3 style={h3Style}>Request Headers</h3>
          <ParamTable
            rows={[
              ["Authorization", "string", "REQUIRED", "Bearer nbr_<your_api_key>"],
              ["Content-Type", "string", "REQUIRED", "application/json"],
              [
                "Origin",
                "string",
                "OPTIONAL",
                "Your domain — required if the key has a domain allowlist",
              ],
            ]}
          />

          <h3 style={h3Style}>Request Body</h3>
          <ParamTable
            rows={[
              ["message", "string", "REQUIRED", "The user's message"],
              [
                "history",
                "array",
                "OPTIONAL",
                "Previous messages [{role: 'user'|'assistant', content: '...'}]",
              ],
              [
                "system_prompt",
                "string",
                "OPTIONAL",
                "Custom system prompt to set AI personality / behavior",
              ],
            ]}
          />

          <h3 style={h3Style}>Response</h3>
          <ParamTable
            rows={[
              ["success", "boolean", "", "true on success"],
              ["response", "string", "", "The AI's reply"],
              ["model", "string", "", "Model name used"],
              ["usage.input_tokens", "integer", "", "Tokens consumed from prompt"],
              ["usage.output_tokens", "integer", "", "Tokens in the response"],
            ]}
          />

          <h3 style={h3Style}>Code Examples</h3>
          <CodeBlock
            language="Python"
            code={`import requests

url = "https://ai.saleonic.com/api/v1/chat"
headers = {
    "Authorization": "Bearer nbr_YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "message": "What is artificial intelligence?",
    "history": [],                                  # Optional
    "system_prompt": "You are an expert researcher." # Optional
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
          />

          <CodeBlock
            language="JavaScript / Node.js"
            code={`const url = "https://ai.saleonic.com/api/v1/chat";

const response = await fetch(url, {
    method: "POST",
    headers: {
        "Authorization": "Bearer nbr_YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: "What is AI?",
        history: [],                                  // Optional
        system_prompt: "You are a helpful assistant." // Optional
    })
});

const data = await response.json();
if (data.success) {
    console.log("AI:", data.response);
    console.log("Tokens:", data.usage);
}`}
          />

          <CodeBlock
            language="cURL"
            code={`curl -X POST https://ai.saleonic.com/api/v1/chat \\
  -H "Authorization: Bearer nbr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What is artificial intelligence?"
  }'`}
          />

          <CodeBlock
            language="PHP"
            code={`<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => "https://ai.saleonic.com/api/v1/chat",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => "POST",
  CURLOPT_POSTFIELDS => json_encode([
      "message" => "What is AI?",
      "system_prompt" => "You are a helpful assistant."
  ]),
  CURLOPT_HTTPHEADER => [
      "Authorization: Bearer nbr_YOUR_API_KEY",
      "Content-Type: application/json"
  ],
]);
$response = curl_exec($curl);
curl_close($curl);
echo $response;
?>`}
          />

          <h3 style={h3Style}>Success Response</h3>
          <CodeBlock
            language="JSON"
            code={`{
  "success": true,
  "response": "Artificial intelligence (AI) is the simulation of human intelligence...",
  "model": "nobrain-1.5",
  "usage": {
    "input_tokens": 245,
    "output_tokens": 512
  }
}`}
          />

          <h3 style={h3Style}>Error Response</h3>
          <CodeBlock
            language="JSON"
            code={`{
  "success": false,
  "error": "Insufficient quota. Please recharge your wallet."
}`}
          />
        </Section>

        {/* ── CANVAS API ──────────────────────────────────────────────── */}
        <Section id="canvas" badge="POST" badgeColor="#0ea5e9" title="Canvas API — Fast Upscale">
          <p style={bodyText}>
            Fast image upscaling powered by{" "}
            <code style={inlineCode}>stability.stable-fast-upscale-v1:0</code> on Amazon
            Bedrock. Submit an image URL with an optional prompt and receive a
            high-quality upscaled image.
          </p>

          <EndpointBadge
            method="POST"
            url="https://ai.saleonic.com/api/v1/canvas"
          />

          <h3 style={h3Style}>Request Body</h3>
          <ParamTable
            rows={[
              [
                "image_url",
                "string",
                "REQUIRED",
                "Public URL of the input image (JPEG, PNG, WebP, GIF)",
              ],
              [
                "prompt",
                "string",
                "OPTIONAL",
                "Text prompt to guide the upscaling process",
              ],
            ]}
          />

          <h3 style={h3Style}>Response</h3>
          <ParamTable
            rows={[
              ["success", "boolean", "", "true on success"],
              ["image_url", "string", "", "CDN URL of the upscaled image"],
              [
                "images",
                "array",
                "",
                "Array of Base64-encoded upscaled image strings",
              ],
              ["model", "string", "", "Model ID used for processing"],
            ]}
          />

          <h3 style={h3Style}>Code Examples</h3>
          <CodeBlock
            language="Python"
            code={`import requests

url = "https://ai.saleonic.com/api/v1/canvas"
headers = {
    "Authorization": "Bearer nbr_YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "image_url": "https://example.com/photo.jpg",
    "prompt": "Enhance details, crystal clear high quality"  # Optional
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
if data.get("success"):
    print("Upscaled Image:", data.get("image_url"))`}
          />

          <CodeBlock
            language="JavaScript / Node.js"
            code={`const response = await fetch("https://ai.saleonic.com/api/v1/canvas", {
    method: "POST",
    headers: {
        "Authorization": "Bearer nbr_YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        image_url: "https://example.com/photo.jpg",
        prompt: "Enhance details, ultra detailed" // Optional
    })
});

const data = await response.json();
if (data.success) {
    console.log("Upscaled URL:", data.image_url);
}`}
          />

          <CodeBlock
            language="cURL"
            code={`curl -X POST https://ai.saleonic.com/api/v1/canvas \\
  -H "Authorization: Bearer nbr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "prompt": "High quality sharp upscale"
  }'`}
          />

          <h3 style={h3Style}>Success Response</h3>
          <CodeBlock
            language="JSON"
            code={`{
  "success": true,
  "image_url": "https://your-bucket.s3.amazonaws.com/canvas/result_1234567890_abc123.png",
  "images": [
    "iVBORw0KGgoAAAANSUhEUgAA..."
  ],
  "model": "stability.stable-fast-upscale-v1:0"
}`}
          />
        </Section>

        {/* ── Domain Protection ─────────────────────────────────────────── */}
        <Section id="domain-protection" badge="SECURITY" badgeColor="#16a34a" title="Domain Protection">
          <p style={bodyText}>
            Each API key can optionally be restricted to specific domains. When a
            domain allowlist is set, requests are only accepted if the{" "}
            <code style={inlineCode}>Origin</code> or{" "}
            <code style={inlineCode}>Referer</code> header matches one of the
            listed domains. Keys without a domain allowlist accept requests from
            anywhere.
          </p>

          <Callout icon="💡" title="How to configure">
            Go to the{" "}
            <a href="/developer" style={{ color: "#a78bfa" }}>
              Developer Dashboard
            </a>{" "}
            → select a key → edit the domain allowlist. Wildcards are supported:{" "}
            <code style={inlineCode}>*.example.com</code> matches all subdomains.
          </Callout>

          <h3 style={h3Style}>Example — Restricted Key</h3>
          <CodeBlock
            language="cURL"
            code={`# This request will be BLOCKED if the key allows only "yourdomain.com"
curl -X POST https://ai.saleonic.com/api/v1/chat \\
  -H "Authorization: Bearer nbr_YOUR_API_KEY" \\
  -H "Origin: https://yourdomain.com" \\    # ← must match allowlist
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello"}'`}
          />

          <CodeBlock
            language="JSON — Blocked response"
            code={`{
  "success": false,
  "error": "Request blocked: origin \\"evil.com\\" is not in the allowed domain list for this API key."
}`}
          />
        </Section>

        {/* ── Rate Limits ──────────────────────────────────────────────── */}
        <Section id="rate-limits" badge="INFO" badgeColor="#d97706" title="Rate Limits & Quota">
          <p style={bodyText}>
            API usage is deducted from your wallet balance. Ensure your wallet
            has sufficient balance before making requests.
          </p>
          <div
            style={{
              overflowX: "auto",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                  {["Plan", "Requests/Day", "Max Tokens/Request"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "13px",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Free", "100", "4,096"],
                  ["Pro", "10,000", "4,096"],
                  ["Enterprise", "Unlimited", "8,192"],
                ].map(([plan, req, tok]) => (
                  <tr key={plan} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={tdStyle}>{plan}</td>
                    <td style={tdStyle}>{req}</td>
                    <td style={tdStyle}>{tok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({
  id,
  badge,
  badgeColor,
  title,
  children,
}: {
  id: string
  badge: string
  badgeColor: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "36px",
        marginBottom: "32px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <span
          style={{
            background: badgeColor,
            color: "#fff",
            fontSize: "11px",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: "6px",
            letterSpacing: "0.05em",
          }}
        >
          {badge}
        </span>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#fff",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function EndpointBadge({ method, url }: { method: string; url: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "12px 16px",
        margin: "16px 0 24px",
        fontFamily: "monospace",
        fontSize: "14px",
      }}
    >
      <span
        style={{
          background: "#7c3aed",
          color: "#fff",
          padding: "2px 10px",
          borderRadius: "6px",
          fontWeight: 700,
          fontSize: "12px",
        }}
      >
        {method}
      </span>
      <span style={{ color: "#a78bfa" }}>{url}</span>
    </div>
  )
}

function ParamTable({ rows }: { rows: string[][] }) {
  const headers =
    rows[0]?.length === 4
      ? ["Parameter", "Type", "Required", "Description"]
      : ["Field", "Type", "Description"]

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.07)",
        margin: "8px 0 20px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.04)" }}>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 600,
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "10px 14px",
                    color:
                      j === 0
                        ? "#a78bfa"
                        : j === 2
                        ? cell === "REQUIRED"
                          ? "#f87171"
                          : "#6b7280"
                        : "rgba(255,255,255,0.65)",
                    fontFamily: j === 0 ? "monospace" : "inherit",
                    fontSize: j === 0 ? "13px" : "inherit",
                    whiteSpace: j === 0 ? "nowrap" : "normal",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div
      style={{
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        margin: "12px 0 20px",
      }}
    >
      <div
        style={{
          background: "#1e1e2e",
          padding: "10px 16px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.45)",
          fontWeight: 600,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {language}
      </div>
      <pre
        style={{
          background: "#12121c",
          margin: 0,
          padding: "18px",
          color: "#c9d1d9",
          fontSize: "13px",
          lineHeight: 1.65,
          overflowX: "auto",
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          whiteSpace: "pre",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Callout({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: "rgba(167,139,250,0.08)",
        border: "1px solid rgba(167,139,250,0.25)",
        borderRadius: "12px",
        padding: "16px 20px",
        margin: "20px 0 28px",
        color: "rgba(255,255,255,0.75)",
        fontSize: "14.5px",
        lineHeight: 1.7,
      }}
    >
      <strong style={{ color: "#a78bfa" }}>
        {icon} {title}
      </strong>
      <br />
      {children}
    </div>
  )
}

const bodyText: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  lineHeight: 1.75,
  marginBottom: "20px",
  fontSize: "15px",
}

const h3Style: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.85)",
  margin: "24px 0 10px",
  letterSpacing: "0.02em",
}

const inlineCode: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  padding: "1px 6px",
  borderRadius: "4px",
  fontFamily: "monospace",
  fontSize: "13px",
  color: "#a78bfa",
}

const tdStyle: React.CSSProperties = {
  padding: "10px 16px",
  color: "rgba(255,255,255,0.65)",
  fontSize: "14px",
}
