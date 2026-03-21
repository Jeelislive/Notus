import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-zinc-100">Welcome back</h1>
        <p className="text-sm text-zinc-400">Sign in to your Notus account</p>
      </div>
      <LoginForm />
    </div>
  )
}
