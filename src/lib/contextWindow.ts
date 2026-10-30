export const DEFAULT_CONTEXT_WINDOW_LIMIT = 128000 // 128k tokens

/**
 * Parses context limit from an env string, supporting values like "128k", "128K", "128000".
 */
export function parseContextLimit(rawVal?: string | number | null): number {
  if (!rawVal) return DEFAULT_CONTEXT_WINDOW_LIMIT

  if (typeof rawVal === "number") {
    return rawVal > 0 ? rawVal : DEFAULT_CONTEXT_WINDOW_LIMIT
  }

  const str = String(rawVal).trim().toLowerCase()
  if (str.endsWith("k")) {
    const num = parseFloat(str.slice(0, -1))
    return !isNaN(num) && num > 0 ? Math.round(num * 1000) : DEFAULT_CONTEXT_WINDOW_LIMIT
  }

  const parsed = parseInt(str, 10)
  return !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_CONTEXT_WINDOW_LIMIT
}

export function getContextWindowLimit(): number {
  // Try NEXT_PUBLIC first for browser & server, fallback to CHAT_CONTEXT_WINDOW_LIMIT
  const envVal =
    (typeof process !== "undefined" && process.env
      ? process.env.NEXT_PUBLIC_CHAT_CONTEXT_WINDOW_LIMIT || process.env.CHAT_CONTEXT_WINDOW_LIMIT
      : null)
  return parseContextLimit(envVal)
}

export interface ContextMessageLike {
  role?: string
  content?: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

/**
 * Accurately calculate the current conversation context tokens.
 * In LLM multi-turn chat (Bedrock converse), the latest assistant message's
 * prompt_tokens includes the full conversation history up to that turn,
 * and completion_tokens is the response length.
 * Subsequent user messages are estimated at ceil(length / 4).
 */
export function calculateConversationTokens(messages: ContextMessageLike[]): number {
  if (!messages || messages.length === 0) return 0

  let latestAssistantIndex = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      latestAssistantIndex = i
      break
    }
  }

  if (latestAssistantIndex >= 0) {
    const asstMsg = messages[latestAssistantIndex]
    const asstTokens =
      (asstMsg.total_tokens && asstMsg.total_tokens > 0)
        ? asstMsg.total_tokens
        : (asstMsg.prompt_tokens || 0) + (asstMsg.completion_tokens || 0)

    // Fallback if tokens were not tracked: estimate from content length
    const baseTokens = asstTokens > 0
      ? asstTokens
      : Math.max(1, Math.ceil((asstMsg.content?.length || 0) / 4))

    // Add subsequent user messages
    let subsequentTokens = 0
    for (let i = latestAssistantIndex + 1; i < messages.length; i++) {
      const msg = messages[i]
      const t = msg.prompt_tokens || Math.max(1, Math.ceil((msg.content?.length || 0) / 4))
      subsequentTokens += t
    }

    return baseTokens + subsequentTokens
  }

  // If no assistant response yet, estimate all user messages
  let totalEstimated = 0
  for (const m of messages) {
    const t = m.prompt_tokens || Math.max(1, Math.ceil((m.content?.length || 0) / 4))
    totalEstimated += t
  }
  return totalEstimated
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    const k = (tokens / 1000).toFixed(tokens >= 10000 ? 0 : 1)
    return `${k.replace(/\.0$/, "")}k`
  }
  return `${tokens}`
}

export interface ContextUsageInfo {
  current: number
  limit: number
  percentage: number
  isFull: boolean
  formattedCurrent: string
  formattedLimit: string
}

export function getContextUsageInfo(
  messages: ContextMessageLike[],
  customLimit?: number
): ContextUsageInfo {
  const limit = customLimit || getContextWindowLimit()
  const current = calculateConversationTokens(messages)
  const percentage = Math.min(100, Math.round((current / limit) * 100))
  const isFull = current >= limit

  return {
    current,
    limit,
    percentage,
    isFull,
    formattedCurrent: formatTokenCount(current),
    formattedLimit: formatTokenCount(limit),
  }
}

