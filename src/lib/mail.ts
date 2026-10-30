import nodemailer from "nodemailer"

export function getMailTransporter() {
  const host =
    process.env.MAIL_HOST || "rdays23jgc63.zevm.mail-manager-smtp.amazonaws.com"
  const port = Number(process.env.MAIL_PORT) || 587
  const encryption = (process.env.MAIL_ENCRYPTION || "tls").toLowerCase()
  const secure = encryption === "ssl" || port === 465
  const user = process.env.MAIL_USERNAME || "inp-ybufnmpmaz3x5hivbcaukbbd"
  const pass =
    process.env.MAIL_PASSWORD || "Daw}M1=gV!oEWt7M^ykGa79t{q5S0+v_"

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
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

