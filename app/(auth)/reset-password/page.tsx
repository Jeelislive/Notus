import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'Reset password',
}

export default function ResetPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-zinc-100">Set new password</h1>
        <p className="text-sm text-zinc-400">Choose a strong password for your account</p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
