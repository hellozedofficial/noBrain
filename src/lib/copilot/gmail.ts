import "server-only"
import { getIntegration, connectIntegration } from "./integrations"
import { execute, query } from "@/lib/db"

interface GmailAccountAuth {
  email: string
  accessToken: string
  refreshToken?: string
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4) {
    base64 += "="
  }
  return Buffer.from(base64, "base64").toString("utf-8")
}

/**
 * Retrieves valid Google OAuth access token, automatically refreshing if needed.
 */
export async function getValidAccessToken(userId: string): Promise<GmailAccountAuth> {
  const integration = await getIntegration(userId, "gmail")
  if (!integration || integration.status !== "connected") {
    throw new Error("Gmail integration is not connected. Connect Gmail in Workspace Integrations first.")
  }

  const meta = integration.metadata || {}
  const email = integration.account_email || ""
  let accessToken = meta.access_token as string
  const refreshToken = meta.refresh_token as string

  // If we have a refresh token and client credentials, check or prepare for refresh
  if (refreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // If token is simulated or missing, refresh immediately
    if (!accessToken || accessToken.startsWith("simulated_")) {
      try {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        })

        if (refreshRes.ok) {
          const tokenData = await refreshRes.json()
          accessToken = tokenData.access_token
          const updatedMeta = { ...meta, access_token: accessToken, refreshed_at: new Date().toISOString() }
          await execute(
            "UPDATE copilot_integrations SET metadata = ?, updated_at = NOW() WHERE user_id = ? AND provider = 'gmail'",
            [JSON.stringify(updatedMeta), userId]
          )
        }
      } catch (e) {
        console.warn("Could not proactively refresh token:", e)
      }
    }
  }

  return { email, accessToken, refreshToken }
}

/**
 * Execute an authenticated Gmail API request with automatic 401 token refresh retry.
 */
async function callGmailApi(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let auth = await getValidAccessToken(userId)

  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${auth.accessToken}`,
    },
  })

  // If 401 Unauthorized, try refreshing token once
  if (res.status === 401 && auth.refreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: auth.refreshToken,
          grant_type: "refresh_token",
        }),
      })

      if (refreshRes.ok) {
        const tokenData = await refreshRes.json()
        const newAccessToken = tokenData.access_token

        // Update database
        const integration = await getIntegration(userId, "gmail")
        const updatedMeta = {
          ...(integration?.metadata || {}),
          access_token: newAccessToken,
          refreshed_at: new Date().toISOString(),
        }
        await execute(
          "UPDATE copilot_integrations SET metadata = ?, updated_at = NOW() WHERE user_id = ? AND provider = 'gmail'",
          [JSON.stringify(updatedMeta), userId]
        )

        // Retry original request with fresh token
        res = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          },
        })
      }
    } catch (e) {
      console.error("Token refresh failed during API call:", e)
    }
  }

  return res
}

/**
 * Build RFC 2822 MIME formatted email
 */
function createMimeMessage(params: {
  from: string
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  inReplyTo?: string
  references?: string
  threadId?: string
}): string {
  const lines: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ]

  if (params.cc) lines.push(`Cc: ${params.cc}`)
  if (params.bcc) lines.push(`Bcc: ${params.bcc}`)
  if (params.inReplyTo) lines.push(`In-Reply-To: ${params.inReplyTo}`)
  if (params.references) lines.push(`References: ${params.references}`)

  const formattedHtml = params.body.includes("<p>") || params.body.includes("<div")
    ? params.body
    : `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #18181b; white-space: pre-wrap;">${params.body}</div>`

  lines.push("", Buffer.from(formattedHtml, "utf-8").toString("base64"))
  return lines.join("\r\n")
}

// 1. Send Email
export async function sendGmail(
  userId: string,
  params: {
    to: string
    subject: string
    body: string
    cc?: string
    bcc?: string
    inReplyTo?: string
    references?: string
    threadId?: string
  }
) {
  const auth = await getValidAccessToken(userId)
  const mime = createMimeMessage({
    from: auth.email,
    to: params.to,
    subject: params.subject,
    body: params.body,
    cc: params.cc,
    bcc: params.bcc,
    inReplyTo: params.inReplyTo,
    references: params.references,
    threadId: params.threadId,
  })

  const raw = base64UrlEncode(mime)
  const payload: any = { raw }
  if (params.threadId) {
    payload.threadId = params.threadId
  }

  const res = await callGmailApi(userId, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gmail API send error (${res.status}): ${errorText}`)
  }

  return await res.json()
}

// 2. Create Draft
export async function createGmailDraft(
  userId: string,
  params: { to: string; subject: string; body: string }
) {
  const auth = await getValidAccessToken(userId)
  const mime = createMimeMessage({
    from: auth.email,
    to: params.to,
    subject: params.subject,
    body: params.body,
  })

  const raw = base64UrlEncode(mime)

  const res = await callGmailApi(userId, "https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw } }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gmail API draft error (${res.status}): ${errorText}`)
  }

  return await res.json()
}

// 3. Search & List Emails
export async function searchGmail(
  userId: string,
  query: string,
  maxResults = 5
) {
  const params = new URLSearchParams({
    q: query || "",
    maxResults: String(Math.min(maxResults, 15)),
  })

  const res = await callGmailApi(
    userId,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gmail API search error (${res.status}): ${errorText}`)
  }

  const listData = await res.json()
  const messages = listData.messages || []

  // Fetch summary metadata for each message
  const summaries = await Promise.all(
    messages.slice(0, maxResults).map(async (m: any) => {
      try {
        const detailRes = await callGmailApi(
          userId,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
        )
        if (!detailRes.ok) return { id: m.id, threadId: m.threadId }

        const detail = await detailRes.json()
        const headers = detail.payload?.headers || []
        const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)"
        const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || ""
        const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || ""

        return {
          id: detail.id,
          threadId: detail.threadId,
          subject,
          from,
          date,
          snippet: detail.snippet || "",
        }
      } catch {
        return { id: m.id, threadId: m.threadId }
      }
    })
  )

  return {
    totalResultSizeEstimate: listData.resultSizeEstimate || summaries.length,
    messages: summaries,
  }
}

// 4. Read Full Email Content
export async function readGmail(userId: string, messageId: string) {
  const res = await callGmailApi(
    userId,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gmail API read error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const headers = data.payload?.headers || []

  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ""

  const subject = getHeader("Subject") || "(No Subject)"
  const from = getHeader("From")
  const to = getHeader("To")
  const date = getHeader("Date")
  const messageIdHeader = getHeader("Message-ID")

  // Extract plain text / HTML body
  let body = ""
  function extractBody(part: any) {
    if (part.body?.data) {
      const decoded = base64UrlDecode(part.body.data)
      if (part.mimeType === "text/plain") {
        body = decoded
      } else if (part.mimeType === "text/html" && !body) {
        body = decoded
      }
    }
    if (part.parts && Array.isArray(part.parts)) {
      for (const p of part.parts) {
        extractBody(p)
      }
    }
  }

  if (data.payload) {
    extractBody(data.payload)
  }

  // Strip complex HTML if body is HTML
  const cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()

  return {
    id: data.id,
    threadId: data.threadId,
    subject,
    from,
    to,
    date,
    messageIdHeader,
    snippet: data.snippet,
    body: cleanBody || data.snippet,
    labelIds: data.labelIds || [],
  }
}

// 5. Reply to Email Thread
export async function replyToGmailThread(
  userId: string,
  params: {
    messageId: string
    body: string
  }
) {
  const original = await readGmail(userId, params.messageId)
  const auth = await getValidAccessToken(userId)

  let replySubject = original.subject
  if (!replySubject.toLowerCase().startsWith("re:")) {
    replySubject = `Re: ${replySubject}`
  }

  // Extract pure email from 'From' header (e.g. "John Doe <john@example.com>" -> "john@example.com")
  const recipient = original.from.replace(/.*<([^>]+)>.*/, "$1").trim() || original.from

  return await sendGmail(userId, {
    to: recipient,
    subject: replySubject,
    body: params.body,
    inReplyTo: original.messageIdHeader,
    references: original.messageIdHeader,
    threadId: original.threadId,
  })
}

// 6. Manage Email (Archive, Star, Mark Read/Unread)
export async function manageGmailMessage(
  userId: string,
  params: {
    messageId: string
    action: "mark_read" | "mark_unread" | "star" | "unstar" | "archive"
  }
) {
  const addLabelIds: string[] = []
  const removeLabelIds: string[] = []

  switch (params.action) {
    case "mark_read":
      removeLabelIds.push("UNREAD")
      break
    case "mark_unread":
      addLabelIds.push("UNREAD")
      break
    case "star":
      addLabelIds.push("STARRED")
      break
    case "unstar":
      removeLabelIds.push("STARRED")
      break
    case "archive":
      removeLabelIds.push("INBOX")
      break
  }

  const res = await callGmailApi(
    userId,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(params.messageId)}/modify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gmail API modify error (${res.status}): ${errorText}`)
  }

  return await res.json()
}

// 7. Bulk Mark Unread Emails as Read with Pagination & Batch Processing
export async function bulkMarkGmailAsRead(
  userId: string,
  params: {
    query?: string
    maxEmails?: number
    batchSize?: number
    onProgress?: (processed: number) => void
  } = {}
): Promise<{
  success: boolean
  totalMarkedRead: number
  query: string
  hasMore: boolean
  durationMs: number
}> {
  const startTime = Date.now()
  const q = params.query && params.query.trim()
    ? `(${params.query.trim()}) and is:unread`
    : "is:unread"
  const maxEmails = Math.max(1, Math.min(params.maxEmails ?? 5000, 10000))
  const batchSize = Math.min(params.batchSize ?? 500, 1000)

  let totalMarkedRead = 0
  let pageToken: string | undefined = undefined
  let hasMore = false

  while (totalMarkedRead < maxEmails) {
    const fetchLimit = Math.min(batchSize, maxEmails - totalMarkedRead)
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
      q
    )}&maxResults=${fetchLimit}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`

    const listRes = await callGmailApi(userId, listUrl)
    if (!listRes.ok) {
      const errText = await listRes.text()
      throw new Error(`Gmail API list error (${listRes.status}): ${errText}`)
    }

    const listData = await listRes.json()
    const messages: Array<{ id: string }> = listData.messages || []

    if (messages.length === 0) {
      hasMore = false
      break
    }

    const messageIds = messages.map((m) => m.id)

    // Call batchModify to remove UNREAD label from all IDs in batch
    const modRes = await callGmailApi(
      userId,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: messageIds,
          removeLabelIds: ["UNREAD"],
        }),
      }
    )

    if (!modRes.ok) {
      const errText = await modRes.text()
      throw new Error(`Gmail batchModify error (${modRes.status}): ${errText}`)
    }

    totalMarkedRead += messageIds.length
    if (params.onProgress) {
      params.onProgress(totalMarkedRead)
    }

    if (!listData.nextPageToken) {
      hasMore = false
      break
    }

    pageToken = listData.nextPageToken
    hasMore = true

    // Small delay between batches to respect rate limits
    if (totalMarkedRead < maxEmails) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return {
    success: true,
    totalMarkedRead,
    query: q,
    hasMore,
    durationMs: Date.now() - startTime,
  }
}


