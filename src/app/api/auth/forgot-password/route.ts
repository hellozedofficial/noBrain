import { NextResponse } from "next/server"
import crypto from "crypto"
import { query, execute } from "@/lib/db"
import { sendPasswordResetOtpEmail } from "@/lib/mail"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    // 1. Check if user exists with this email
    const users = await query(
      "SELECT id, name, email FROM users WHERE email = ?",
      [trimmedEmail]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      )
    }

    // 2. Ensure table exists
    await execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(191) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_otp (email, otp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `)

    // 3. Optional cooldown: check if code was generated less than 60 seconds ago
    const recentResets = await query<any>(
      "SELECT created_at FROM password_resets WHERE email = ? AND created_at > (NOW() - INTERVAL 1 MINUTE)",
      [trimmedEmail]
    )

    if (recentResets && recentResets.length > 0) {
      return NextResponse.json(
        { error: "A reset code was recently sent. Please wait a minute before requesting another." },
        { status: 429 }
      )
    }

    // 4. Generate cryptographically strong 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString()

    // Invalidate previous OTPs for this email
    await execute("DELETE FROM password_resets WHERE email = ?", [trimmedEmail])

    // Save new OTP (expires in 10 minutes)
    await execute(
      "INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, NOW() + INTERVAL 10 MINUTE)",
      [trimmedEmail, otp]
    )

    // 5. Send email via SMTP
    await sendPasswordResetOtpEmail(trimmedEmail, otp)

    return NextResponse.json({
      success: true,
      message: "A 6-digit reset code has been sent to your email.",
    })
  } catch (error: any) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process forgot password request" },
      { status: 500 }
    )
  }
}
