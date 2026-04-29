import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Verify email',
}

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#0075de]/10">
        <svg className="size-8 text-[#62aef0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-100">Verify your email</h1>
        <p className="text-sm text-zinc-400">
          We&apos;ve sent a verification link to your email address.
          Click the link to activate your account.
        </p>
      </div>
      <div className="space-y-3">
        <p className="text-xs text-zinc-600">
          Didn&apos;t receive the email? Check your spam folder or try signing in again.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Back to login
          </Button>
        </Link>
      </div>
    </div>
  )
}
