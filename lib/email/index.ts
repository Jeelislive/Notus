import { Resend } from 'resend'
import { VerifyEmailTemplate } from './templates/verify-email'
import { ResetPasswordTemplate } from './templates/reset-password'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@notus.app'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function sendVerificationEmail(
  to: string,
  confirmUrl: string
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your Notus account',
    react: VerifyEmailTemplate({ confirmUrl, appUrl: APP_URL }),
  })
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Notus password',
    react: ResetPasswordTemplate({ resetUrl, appUrl: APP_URL }),
  })
}
