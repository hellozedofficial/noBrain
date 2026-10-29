import bcrypt from "bcryptjs"
import crypto from "crypto"
import { cookies } from "next/headers"
import { query } from "./db"

const SESSION_COOKIE_NAME = "nobrain_session"
const SECRET = process.env.AUTH_SECRET || "nobrain-secret-key-32-chars-long-secure-salt!"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url")
  return `${payload}.${signature}`
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    const [payload, signature] = token.split(".")
    if (!payload || !signature) return null

    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url")

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      const decoded = Buffer.from(payload, "base64url").toString("utf-8")
      return JSON.parse(decoded) as T
    }
    return null
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const decoded = verifyToken<{ userId: string }>(token)
  if (!decoded?.userId) return null

  const users = await query(
    "SELECT id, name, email, last_used_model, created_at FROM users WHERE id = ?",
    [decoded.userId]
  )

  return users[0] || null
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies()
  const token = signToken({ userId })
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
