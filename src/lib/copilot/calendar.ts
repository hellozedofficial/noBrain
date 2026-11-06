import "server-only"
import { googleApiFetch } from "./googleAuth"
import crypto from "crypto"

export interface CalendarEventAttendee {
  email: string
  displayName?: string
  responseStatus?: string
}

export interface CreateEventOptions {
  summary: string
  description?: string
  start: string // ISO string or YYYY-MM-DD
  end?: string // ISO string or YYYY-MM-DD
  timeZone?: string
  location?: string
  attendees?: string[] // list of email strings
  createMeetLink?: boolean
}

export interface ListEventsOptions {
  query?: string
  timeMin?: string // ISO string (defaults to now)
  timeMax?: string // ISO string
  maxResults?: number
}

/**
 * Fetches the user's primary calendar timezone directly from Google Calendar,
 * falling back to APP_TIMEZONE or "Asia/Dhaka" (+06:00).
 */
export async function getUserCalendarTimezone(userId: string): Promise<string> {
  try {
    const res = await googleApiFetch(userId, "https://www.googleapis.com/calendar/v3/calendars/primary")
    if (res.ok) {
      const data = await res.json()
      if (data.timeZone) {
        return data.timeZone
      }
    }
  } catch (err: any) {
    console.warn("Could not retrieve user calendar timezone:", err.message)
  }
  return process.env.APP_TIMEZONE || "Asia/Dhaka"
}

/**
 * Calculates the timezone offset string (+HH:mm or -HH:mm) for a given date in target timezone.
 */
export function getTimezoneOffsetString(date: Date, timeZone: string): string {
  try {
    const str = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).format(date)
    const match = str.match(/GMT([+-]\d{2}):?(\d{2})?/)
    if (!match) return "+06:00"
    return `${match[1]}:${match[2] || "00"}`
  } catch {
    return "+06:00"
  }
}

/**
 * Normalizes an ISO or datetime string to ensure it reflects local time with the correct timezone offset.
 * Crucially strips trailing 'Z' (which would otherwise force Google to interpret the local hour as UTC),
 * preventing unwanted 6-hour shifts.
 */
export function formatWithTargetTimezone(isoOrDateStr: string, targetTz: string = "Asia/Dhaka"): string {
  if (!isoOrDateStr || !isoOrDateStr.includes("T")) return isoOrDateStr

  // If already formatted with an explicit non-Z offset (e.g. +06:00 or -05:00), retain it
  if (/[+-]\d{2}:\d{2}$/.test(isoOrDateStr)) {
    return isoOrDateStr
  }

  // Strip trailing Z or .000Z to treat the wall-clock time as the user's local intended time
  let clean = isoOrDateStr.replace(/\.\d+Z$/i, "").replace(/Z$/i, "")

  // Ensure seconds are included if missing (e.g. 2026-11-13T13:00 -> 2026-11-13T13:00:00)
  if (/T\d{2}:\d{2}$/.test(clean)) {
    clean += ":00"
  }

  const offset = getTimezoneOffsetString(new Date(clean), targetTz)
  return `${clean}${offset}`
}

/**
 * Lists events from the user's primary Google Calendar.
 */
export async function listCalendarEvents(userId: string, options: ListEventsOptions = {}) {
  const defaultTz = await getUserCalendarTimezone(userId)
  const params = new URLSearchParams()
  params.set("singleEvents", "true")
  params.set("orderBy", "startTime")
  params.set("maxResults", String(options.maxResults || 10))

  if (options.timeMin) {
    params.set("timeMin", formatWithTargetTimezone(options.timeMin, defaultTz))
  } else {
    // Default to start of today in user's timezone
    params.set("timeMin", new Date().toISOString())
  }

  if (options.timeMax) {
    params.set("timeMax", formatWithTargetTimezone(options.timeMax, defaultTz))
  }

  if (options.query) {
    params.set("q", options.query)
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`
  const res = await googleApiFetch(userId, url)

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const items = (data.items || []).map((e: any) => ({
    id: e.id,
    summary: e.summary || "(No Title)",
    description: e.description || "",
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    location: e.location || "",
    status: e.status,
    htmlLink: e.htmlLink,
    hangoutLink: e.hangoutLink || e.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri || null,
    attendees: (e.attendees || []).map((a: any) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
  }))

  return {
    events: items,
    total: items.length,
    timeZone: data.timeZone || defaultTz,
  }
}

/**
 * Creates a new event in the user's primary Google Calendar, with optional Google Meet link.
 * Interprets dates and times in the user's local timezone (Asia/Dhaka, +06:00).
 */
export async function createCalendarEvent(userId: string, opts: CreateEventOptions) {
  const isAllDay = !opts.start.includes("T")
  const defaultTz = opts.timeZone || (await getUserCalendarTimezone(userId)) || "Asia/Dhaka"

  let startFormatted = opts.start
  let endFormatted = opts.end || ""

  if (!isAllDay) {
    startFormatted = formatWithTargetTimezone(opts.start, defaultTz)
    if (!endFormatted) {
      // Default to 1 hour after start
      const d = new Date(startFormatted)
      d.setHours(d.getHours() + 1)
      endFormatted = formatWithTargetTimezone(d.toISOString(), defaultTz)
    } else {
      endFormatted = formatWithTargetTimezone(endFormatted, defaultTz)
    }
  }

  const eventPayload: any = {
    summary: opts.summary,
    description: opts.description || "",
    location: opts.location || "",
    start: isAllDay
      ? { date: startFormatted }
      : { dateTime: startFormatted, timeZone: defaultTz },
    end: isAllDay
      ? { date: endFormatted }
      : { dateTime: endFormatted, timeZone: defaultTz },
  }

  if (opts.attendees && opts.attendees.length > 0) {
    eventPayload.attendees = opts.attendees.map((email) => ({ email: email.trim() }))
  }

  // Create native Google Meet conference if requested (or default true for meetings)
  if (opts.createMeetLink !== false) {
    eventPayload.conferenceData = {
      createRequest: {
        requestId: "meet_" + crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    }
  }

  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
  const res = await googleApiFetch(userId, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventPayload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create calendar event (${res.status}): ${errorText}`)
  }

  const created = await res.json()
  const meetUri =
    created.hangoutLink ||
    created.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ||
    null

  return {
    id: created.id,
    summary: created.summary,
    start: created.start?.dateTime || created.start?.date,
    end: created.end?.dateTime || created.end?.date,
    htmlLink: created.htmlLink,
    meetLink: meetUri,
    attendees: (created.attendees || []).map((a: any) => a.email),
  }
}

/**
 * Deletes an event by its ID.
 */
export async function deleteCalendarEvent(userId: string, eventId: string) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`
  const res = await googleApiFetch(userId, url, { method: "DELETE" })

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text()
    throw new Error(`Failed to delete calendar event (${res.status}): ${errorText}`)
  }

  return { success: true, eventId }
}

