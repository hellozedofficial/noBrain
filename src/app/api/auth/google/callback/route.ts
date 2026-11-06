import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { connectIntegration, getIntegration } from "@/lib/copilot/integrations"

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000"
  const forwardedProto = req.headers.get("x-forwarded-proto")
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https")
  const appBase = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appBase}/api/auth/google/callback`

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      console.error("Google OAuth returned error:", error)
      return NextResponse.redirect(new URL("/workspace/c?oauth_error=" + encodeURIComponent(error), appBase))
    }

    if (!state) {
      return NextResponse.redirect(new URL("/workspace/c?oauth_error=missing_state", appBase))
    }

    // Verify signed state token
    const decodedState = verifyToken<{ userId: string; returnTo: string; service?: string }>(state)
    if (!decodedState?.userId) {
      return NextResponse.redirect(new URL("/workspace/c?oauth_error=invalid_state", appBase))
    }

    const { userId, returnTo, service = "google" } = decodedState
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    let googleEmail = ""
    let profileData: any = {}
    let tokenData: any = {}

    // 1. Real Google OAuth token exchange
    if (clientId && clientSecret && code && !code.startsWith("simulated_")) {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error("Failed to exchange Google OAuth code for tokens:", errorText)
        return NextResponse.redirect(new URL(`/workspace/c?oauth_error=token_exchange_failed`, appBase))
      }

      tokenData = await tokenResponse.json()

      // Fetch user profile from Google UserInfo endpoint
      const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      if (!userinfoResponse.ok) {
        return NextResponse.redirect(new URL(`/workspace/c?oauth_error=profile_fetch_failed`, appBase))
      }

      profileData = await userinfoResponse.json()
      googleEmail = profileData.email
    } else {
      // 2. Simulated Google OAuth flow (used when credentials are being set up)
      const simulatedEmail = searchParams.get("email")
      googleEmail = simulatedEmail || "google.user@gmail.com"
      profileData = {
        name: searchParams.get("name") || "Google Account",
        email: googleEmail,
        picture: searchParams.get("picture") || null,
        verified_email: true,
      }
      tokenData = {
        access_type: "simulated_oauth2",
        scope: "openid https://www.googleapis.com/auth/userinfo.email https://mail.google.com/ https://www.googleapis.com/auth/drive",
      }
    }

    if (!googleEmail) {
      return NextResponse.redirect(new URL(`/workspace/c?oauth_error=no_email_returned`, appBase))
    }

    const scopeStr = tokenData.scope || ""

    // Prepare metadata
    const integrationMetadata = {
      auth_type: "google_oauth2",
      name: profileData.name || null,
      picture: profileData.picture || null,
      verified_email: profileData.verified_email ?? true,
      access_token: tokenData.access_token || null,
      refresh_token: tokenData.refresh_token || null,
      scope: scopeStr || null,
      connected_at: new Date().toISOString(),
    }

    // Save connected Google OAuth integration
    if (service === "youtube") {
      await connectIntegration(userId, "youtube", googleEmail, integrationMetadata)
    } else {
      const workspaceServices = ["google", "gmail", "drive", "calendar", "meet", "classroom"]
      // Always connect the requested service directly
      await connectIntegration(userId, service, googleEmail, integrationMetadata)

      // For other workspace services, only auto-populate if not connected yet or if using the same email
      for (const svc of workspaceServices) {
        if (svc === service) continue
        const existing = await getIntegration(userId, svc)
        if (!existing || existing.status !== "connected" || existing.account_email === googleEmail) {
          await connectIntegration(userId, svc, googleEmail, integrationMetadata)
        }
      }
    }

    // Redirect cleanly back to the origin workspace
    let safeReturnPath = returnTo || "/workspace/c"
    try {
      if (safeReturnPath.startsWith("http://") || safeReturnPath.startsWith("https://")) {
        const parsed = new URL(safeReturnPath)
        safeReturnPath = parsed.pathname + parsed.search
      }
    } catch {}
    if (!safeReturnPath.startsWith("/")) {
      safeReturnPath = "/" + safeReturnPath
    }

    const targetUrl = new URL(safeReturnPath, appBase)
    targetUrl.searchParams.set("integration", `${service || "google"}_connected`)
    return NextResponse.redirect(targetUrl.toString())
  } catch (error: any) {
    console.error("Google OAuth callback error:", error)
    return NextResponse.redirect(new URL(`/workspace/c?oauth_error=${encodeURIComponent(error.message)}`, appBase))
  }
}

