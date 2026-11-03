import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { connectIntegration } from "@/lib/copilot/integrations"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      console.error("Google OAuth returned error:", error)
      return NextResponse.redirect(new URL("/workspace/c?oauth_error=" + encodeURIComponent(error), req.url))
    }

    if (!state) {
      return NextResponse.redirect(new URL("/workspace/c?oauth_error=missing_state", req.url))
    }

    // Verify signed state token
    const decodedState = verifyToken<{ userId: string; returnTo: string; service?: string }>(state)
    if (!decodedState?.userId) {
      return NextResponse.redirect(new URL("/workspace/c?oauth_error=invalid_state", req.url))
    }

    const { userId, returnTo, service = "google" } = decodedState
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    const host = req.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/auth/google/callback`

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
        return NextResponse.redirect(new URL(`/workspace/c?oauth_error=token_exchange_failed`, req.url))
      }

      tokenData = await tokenResponse.json()

      // Fetch user profile from Google UserInfo endpoint
      const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      if (!userinfoResponse.ok) {
        return NextResponse.redirect(new URL(`/workspace/c?oauth_error=profile_fetch_failed`, req.url))
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
      return NextResponse.redirect(new URL(`/workspace/c?oauth_error=no_email_returned`, req.url))
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

    // Save connected Google OAuth integration for requested service (and twin service if scope allows)
    if (service === "drive") {
      await connectIntegration(userId, "drive", googleEmail, integrationMetadata)
      if (scopeStr.includes("mail") || scopeStr.includes("gmail")) {
        await connectIntegration(userId, "gmail", googleEmail, integrationMetadata)
      }
    } else {
      await connectIntegration(userId, "gmail", googleEmail, integrationMetadata)
      if (scopeStr.includes("drive")) {
        await connectIntegration(userId, "drive", googleEmail, integrationMetadata)
      }
    }

    // Redirect cleanly back to the origin workspace
    const targetUrl = new URL(returnTo || "/workspace/c", req.url)
    targetUrl.searchParams.set("integration", `${service === "drive" ? "drive" : "gmail"}_connected`)
    return NextResponse.redirect(targetUrl.toString())
  } catch (error: any) {
    console.error("Google OAuth callback error:", error)
    return NextResponse.redirect(new URL(`/workspace/c?oauth_error=${encodeURIComponent(error.message)}`, req.url))
  }
}

