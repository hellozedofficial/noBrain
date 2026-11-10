import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || ""
  const { pathname } = request.nextUrl

  // Ignore static assets, internal Next.js assets, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Detect Admin Domain (nobrain-hq.saleonic.com) or dedicated local Admin Port (:3005)
  const isAdminHost = host.includes("nobrain-hq") || host.endsWith(":3005")

  if (isAdminHost) {
    // If accessing root "/" on admin domain or port 3005, rewrite directly to /admin
    if (pathname === "/") {
      const url = request.nextUrl.clone()
      url.pathname = "/admin"
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

