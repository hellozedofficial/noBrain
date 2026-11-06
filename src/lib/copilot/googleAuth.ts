import "server-only"
import { getIntegration, connectIntegration, getUserIntegrations } from "./integrations"
import { execute } from "@/lib/db"

export const GOOGLE_WORKSPACE_SERVICES = [
  "gmail",
  "drive",
  "calendar",
  "meet",
  "classroom",
  "youtube",
] as const

export type GoogleWorkspaceService = (typeof GOOGLE_WORKSPACE_SERVICES)[number]

export interface GoogleAuthResult {
  email: string
  accessToken: string
  refreshToken?: string
}

/**
 * Retrieves a valid Google OAuth access token across any connected Google service,
 * automatically refreshing the token if needed.
 */
export async function getValidGoogleToken(
  userId: string,
  targetService?: string
): Promise<GoogleAuthResult> {
  const integrations = await getUserIntegrations(userId)
  
  let googleIntegration: any = null

  if (targetService === "youtube") {
    // Specifically look for YouTube OAuth integration
    googleIntegration = integrations.find(
      (i) => i.status === "connected" && i.provider === "youtube" && i.metadata?.access_token
    )
    if (!googleIntegration) {
      throw new Error(
        "YouTube is not connected yet. Please click 'Integrations' in the bottom sidebar and connect YouTube with Google."
      )
    }
  } else if (targetService) {
    // Look specifically for matching provider first, checking scope if available
    const serviceKeywordMap: Record<string, string[]> = {
      drive: ["drive"],
      calendar: ["calendar"],
      classroom: ["classroom"],
      gmail: ["gmail", "mail.google.com"],
      meet: ["meetings", "calendar"],
    }
    const keywords = serviceKeywordMap[targetService] || []

    // 1. Try exact provider match
    const exact = integrations.find(
      (i) => i.status === "connected" && i.provider === targetService && i.metadata?.access_token
    )
    if (exact) {
      const scope = (exact.metadata?.scope || "").toLowerCase()
      // If we don't know keywords or if scope contains the required keyword
      if (keywords.length === 0 || keywords.some((k) => scope.includes(k))) {
        googleIntegration = exact
      }
    }

    // 2. If exact provider doesn't have the scope, search other workspace integrations
    if (!googleIntegration && keywords.length > 0) {
      googleIntegration = integrations.find(
        (i) =>
          i.status === "connected" &&
          i.provider !== "youtube" &&
          i.metadata?.access_token &&
          keywords.some((k) => (i.metadata?.scope || "").toLowerCase().includes(k))
      )
    }

    // 3. Fallback to exact if found earlier, or any workspace integration
    if (!googleIntegration && exact) {
      googleIntegration = exact
    }
    if (!googleIntegration) {
      googleIntegration = integrations.find(
        (i) =>
          i.status === "connected" &&
          i.provider !== "youtube" &&
          i.metadata?.access_token
      )
    }
  } else {
    // For general workspace tools, find any workspace token (never youtube)
    googleIntegration = integrations.find(
      (i) =>
        i.status === "connected" &&
        i.provider !== "youtube" &&
        i.metadata?.access_token
    )
  }

  if (!googleIntegration) {
    throw new Error(
      "Google Workspace is not connected. Please connect your Google account in Workspace Integrations first."
    )
  }

  const meta = googleIntegration.metadata || {}
  const email = googleIntegration.account_email || ""
  let accessToken = meta.access_token as string
  const refreshToken = meta.refresh_token as string

  // Check if we need to refresh (proactively if expired/stale or if simulated)
  const isSimulated = !accessToken || accessToken.startsWith("simulated_")
  
  let shouldRefresh = isSimulated
  if (!shouldRefresh && (meta.refreshed_at || meta.connected_at)) {
    const lastActivity = new Date(meta.refreshed_at || meta.connected_at).getTime()
    // Google OAuth access tokens expire in 60 mins. Refresh proactively if >45 mins old
    if (Date.now() - lastActivity > 45 * 60 * 1000) {
      shouldRefresh = true
    }
  }

  if (
    refreshToken &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    shouldRefresh
  ) {
    try {
      const refreshed = await refreshGoogleToken(
        userId,
        refreshToken,
        targetService === "youtube" ? "youtube" : "workspace"
      )
      if (refreshed) {
        accessToken = refreshed
      }
    } catch (e) {
      console.warn("Could not proactively refresh token:", e)
    }
  }

  return {
    email,
    accessToken,
    refreshToken,
  }
}

/**
 * Proactively refreshes the user's Google access token using the stored refresh token.
 */
export async function refreshGoogleToken(
  userId: string,
  refreshToken: string,
  serviceDomain: "youtube" | "workspace" = "workspace"
): Promise<string | null> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error("Failed to refresh Google OAuth token:", errText)
    return null
  }

  const tokenData = await res.json()
  const newAccessToken = tokenData.access_token
  if (!newAccessToken) return null

  if (serviceDomain === "youtube") {
    // Only update YouTube integration
    const existing = await getIntegration(userId, "youtube")
    if (existing && existing.status === "connected") {
      const updatedMeta = {
        ...existing.metadata,
        access_token: newAccessToken,
        refreshed_at: new Date().toISOString(),
      }
      await execute(
        "UPDATE copilot_integrations SET metadata = ?, updated_at = NOW() WHERE user_id = ? AND provider = 'youtube'",
        [JSON.stringify(updatedMeta), userId]
      )
    }
  } else {
    // Only update workspace services that share this exact refresh_token (never overwrite a different account or youtube)
    const workspaceServices = ["google", "gmail", "drive", "calendar", "meet", "classroom"]
    for (const s of workspaceServices) {
      const existing = await getIntegration(userId, s)
      if (
        existing &&
        existing.status === "connected" &&
        existing.metadata?.refresh_token === refreshToken
      ) {
        const updatedMeta = {
          ...existing.metadata,
          access_token: newAccessToken,
          refreshed_at: new Date().toISOString(),
        }
        await execute(
          "UPDATE copilot_integrations SET metadata = ?, updated_at = NOW() WHERE user_id = ? AND provider = ?",
          [JSON.stringify(updatedMeta), userId, s]
        )
      }
    }
  }

  return newAccessToken
}

/**
 * Helper to execute a Google REST API request with automatic 401 retry on token expiry.
 */
export async function googleApiFetch(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let targetService = "google"
  if (url.includes("youtube.googleapis.com") || url.includes("/youtube/")) {
    targetService = "youtube"
  } else if (url.includes("drive.googleapis.com") || url.includes("/drive/")) {
    targetService = "drive"
  } else if (url.includes("calendar.googleapis.com") || url.includes("/calendar/")) {
    targetService = "calendar"
  } else if (url.includes("classroom.googleapis.com") || url.includes("/classroom/")) {
    targetService = "classroom"
  } else if (url.includes("meet.googleapis.com") || url.includes("meetings.space") || url.includes("/meetings/")) {
    targetService = "meet"
  } else if (url.includes("gmail.googleapis.com") || url.includes("/gmail/")) {
    targetService = "gmail"
  }

  const isYouTube = targetService === "youtube"
  const auth = await getValidGoogleToken(userId, targetService)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
  }
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v })
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => { headers[k] = v })
    } else {
      Object.assign(headers, options.headers)
    }
  }

  let res = await fetch(url, { ...options, headers, cache: "no-store" })

  // If 401 Unauthorized, attempt refresh once and retry
  if (res.status === 401 && auth.refreshToken) {
    console.warn(`[googleApiFetch] ${isYouTube ? "YouTube" : "Google"} token expired (401), refreshing token and retrying...`)
    const newToken = await refreshGoogleToken(userId, auth.refreshToken, isYouTube ? "youtube" : "workspace")
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`
      res = await fetch(url, { ...options, headers, cache: "no-store" })
    }
  }

  return res
}

