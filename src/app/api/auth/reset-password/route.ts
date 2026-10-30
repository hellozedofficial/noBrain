import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json(
        { error: "A valid 6-digit verification code is required" },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedOtp = otp.trim()

    // 1. Verify user exists
    const users = await query(
      "SELECT id FROM users WHERE email = ?",
      [trimmedEmail]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 }
      )
    }

    // 2. Verify OTP in password_resets
    const resets = await query<any>(
      "SELECT id, otp, expires_at FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [trimmedEmail, trimmedOtp]
    )

    if (!resets || resets.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset code. Please request a new code." },
        { status: 400 }
      )
    }

    // 3. Hash new password
    const passwordHash = await hashPassword(newPassword)

    // 4. Update user's password
    await execute(
      "UPDATE users SET password_hash = ? WHERE email = ?",
      [passwordHash, trimmedEmail]
    )

    // 5. Clean up consumed reset records
    await execute("DELETE FROM password_resets WHERE email = ?", [trimmedEmail])

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    })
  } catch (error: any) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    )
  }
}

