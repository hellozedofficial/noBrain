import nodemailer from "nodemailer"

export function getMailTransporter() {
  const host = process.env.MAIL_HOST || "127.0.0.1"
  const port = Number(process.env.MAIL_PORT) || 587
  const encryption = (process.env.MAIL_ENCRYPTION || "").toLowerCase()
  const secure = encryption === "ssl" || port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

export async function sendPasswordResetOtpEmail(to: string, otp: string) {
  const transporter = getMailTransporter()

  const rawFromName = process.env.MAIL_FROM_NAME || "noBrain"
  const appName = process.env.APP_NAME || "noBrain"
  const fromName = rawFromName.replace("${APP_NAME}", appName)
  const fromAddress = process.env.MAIL_FROM_ADDRESS || "support@saleonic.com"

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject: `noBrain password reset code is: ${otp}`,
    text: `Your noBrain password reset code is: ${otp}\n\nThis code is valid for 10 minutes. If you did not request a password reset, please ignore this email.`,
  }

  return await transporter.sendMail(mailOptions)
}

