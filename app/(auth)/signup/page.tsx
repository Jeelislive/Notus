import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Create account',
}

export default function SignupPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start taking better meeting notes today</p>
      </div>
      <SignupForm />
    </div>
  )
}
