import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-zinc-100">Forgot your password?</h1>
        <p className="text-sm text-zinc-400">Enter your email and we&apos;ll send you a reset link</p>
      </div>
      <ForgotPasswordForm />
    </div>
  )
}
