import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, signToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.redirect(new URL("/?auth=login", req.url))
    }

    const { searchParams } = new URL(req.url)
    const returnTo = searchParams.get("returnTo") || req.headers.get("referer") || "/workspace/c"
    const service = searchParams.get("service") || "google"

    // Create signed state token containing user ID, target service and return path
    const state = signToken({
      userId: user.id,
      returnTo,
      service,
      createdAt: Date.now(),
    })

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    // Determine base URL dynamically (handles localhost:3000 in dev and production domain)
    const host = req.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/auth/google/callback`

    // Combined scopes for Gmail & Google Drive
    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.send",
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
    ].join(" ")

    // If Google OAuth credentials are configured, redirect directly to Google's real OAuth server
    if (clientId && clientSecret && clientId.trim() !== "" && clientSecret.trim() !== "") {
      const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
      googleAuthUrl.searchParams.set("client_id", clientId)
      googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
      googleAuthUrl.searchParams.set("response_type", "code")
      googleAuthUrl.searchParams.set("scope", scopes)
      googleAuthUrl.searchParams.set("access_type", "offline")
      googleAuthUrl.searchParams.set("prompt", "consent")
      googleAuthUrl.searchParams.set("state", state)

      return NextResponse.redirect(googleAuthUrl.toString())
    }

    // If GOOGLE_CLIENT_ID is not configured yet, direct to Google Consent Authorization UI
    const consentUrl = new URL("/auth/google/consent", req.url)
    consentUrl.searchParams.set("state", state)
    consentUrl.searchParams.set("redirect_uri", redirectUri)
    consentUrl.searchParams.set("user_email", user.email || "")
    consentUrl.searchParams.set("service", service)

    return NextResponse.redirect(consentUrl.toString())
  } catch (error: any) {
    console.error("Google OAuth init error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

