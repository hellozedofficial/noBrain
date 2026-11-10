import { OpenRouter } from "@openrouter/sdk"
import { getPlatformConfigValue } from "./platform-config"

export interface OpenRouterModelInfo {
  id: string
  name: string
  description?: string
  contextLength?: number
  pricing?: {
    prompt: string
    completion: string
    image?: string
    request?: string
  }
  architecture?: {
    modality?: string
    inputModalities?: string[]
    outputModalities?: string[]
  }
}

/**
 * Retrieve the active OpenRouter API key.
 * Checks platform_config in the database first, then falls back to process.env.OPENROUTER_API_KEY.
 */
export async function getOpenRouterApiKey(): Promise<string> {
  const dbKey = await getPlatformConfigValue("OPENROUTER_API_KEY", "")
  if (dbKey && dbKey.trim()) return dbKey.trim()
  return (process.env.OPENROUTER_API_KEY || "").trim()
}

/**
 * Initialize OpenRouter SDK instance
 */
export async function getOpenRouterClient(): Promise<OpenRouter> {
  const apiKey = await getOpenRouterApiKey()
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Please configure it in noBrain HQ Admin Panel or set the OPENROUTER_API_KEY environment variable. You can get a key at https://openrouter.ai/keys."
    )
  }
  return new OpenRouter({
    apiKey,
  })
}

/**
 * Fetch available models from OpenRouter API
 */
export async function fetchLiveOpenRouterModels(): Promise<OpenRouterModelInfo[]> {
  const apiKey = await getOpenRouterApiKey()
  const headers: Record<string, string> = {
    "HTTP-Referer": "https://ai.saleonic.com",
    "X-Title": "noBrain",
  }
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    method: "GET",
    headers,
    next: { revalidate: 3600 }, // Cache 1 hour
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch models from OpenRouter: ${res.statusText}`)
  }

  const data = await res.json()
  const rawList = data.data || []

  return rawList.map((m: any) => ({
    id: m.id,
    name: m.name || m.id,
    description: m.description,
    contextLength: m.context_length,
    pricing: m.pricing,
    architecture: {
      modality: m.architecture?.modality,
      inputModalities: m.architecture?.input_modalities || ["text"],
      outputModalities: m.architecture?.output_modalities || ["text"],
    },
  }))
}

/**
 * Perform a single non-streaming chat request with OpenRouter
 */
export async function sendOpenRouterChat({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 2500,
}: {
  model: string
  messages: Array<{ role: "system" | "user" | "assistant"; content: any }>
  temperature?: number
  maxTokens?: number
}) {
  const apiKey = await getOpenRouterApiKey()
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Please create one at https://openrouter.ai/keys and save it in the noBrain HQ Admin Panel."
    )
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ai.saleonic.com",
      "X-Title": "noBrain",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    let errorMsg = `OpenRouter API error (${res.status})`
    try {
      const parsed = JSON.parse(errorBody)
      errorMsg = parsed.error?.message || parsed.message || errorMsg
    } catch {
      errorMsg = errorBody || errorMsg
    }
    throw new Error(errorMsg)
  }

  return await res.json()
}

/**
 * Stream an OpenRouter chat completion turn (supports text + vision + reasoning)
 */
export async function streamOpenRouterChat({
  model,
  messages,
  tools,
  temperature = 0.7,
  maxTokens = 2500,
}: {
  model: string
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: any; tool_call_id?: string; name?: string }>
  tools?: any[]
  temperature?: number
  maxTokens?: number
}): Promise<Response> {
  const apiKey = await getOpenRouterApiKey()
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Please create one at https://openrouter.ai/keys and save it in the noBrain HQ Admin Panel."
    )
  }

  const payload: any = {
    model,
    messages,
    stream: true,
    temperature,
    max_tokens: maxTokens,
  }

  if (tools && tools.length > 0) {
    payload.tools = tools
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ai.saleonic.com",
      "X-Title": "noBrain",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    let errorMsg = `OpenRouter API error (${res.status})`
    try {
      const parsed = JSON.parse(errorBody)
      errorMsg = parsed.error?.message || parsed.message || errorMsg
    } catch {
      errorMsg = errorBody || errorMsg
    }
    throw new Error(errorMsg)
  }

  return res
}

