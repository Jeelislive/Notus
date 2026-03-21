import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Create account',
}

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-zinc-100">Create your account</h1>
        <p className="text-sm text-zinc-400">Start taking better meeting notes today</p>
      </div>
      <SignupForm />
    </div>
  )
}
