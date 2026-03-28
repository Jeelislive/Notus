'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { signIn, signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConsentModal } from './consent-modal'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  consent: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the terms',
  }),
})

type FormData = z.infer<typeof schema>

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { consent: false },
  })

  const consentChecked = watch('consent')

  async function onSubmit(data: FormData) {
    setError(null)
    setLoading(true)
    const { error } = await signUp.email({
      name: data.fullName,
      email: data.email,
      password: data.password,
      callbackURL: '/dashboard',
    })
    if (error) {
      setError(error.message ?? 'Something went wrong')
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    window.location.href = '/dashboard'
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true)
    try {
      await signIn.social({ provider: 'google', callbackURL: '/dashboard' })
    } catch {
      setError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full space-y-4 text-center animate-fade-up">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-indigo-600/10">
          <svg className="size-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Account created!</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;re all set. Redirecting to your dashboard...
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <ConsentModal open={consentOpen} onOpenChange={setConsentOpen} />

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogleSignup}
        disabled={googleLoading || loading}
      >
        {googleLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <svg className="size-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-xs text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Recording Consent */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-medium text-foreground uppercase tracking-wide">Recording Consent (Required)</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Notus records audio from your meetings to generate transcripts and AI-powered notes.
            You are responsible for informing all meeting participants that recording is taking place.
            By using Notus, you confirm you have obtained consent from all participants as required by
            applicable law (including GDPR, CCPA, and wiretapping laws).{' '}
            <button
              type="button"
              onClick={() => setConsentOpen(true)}
              className="text-indigo-600 hover:text-indigo-500 underline"
              style={{ transition: 'color 150ms ease-out' }}
            >
              Read full policy
            </button>
          </p>
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consentChecked}
              onCheckedChange={(checked) => setValue('consent', checked === true)}
            />
            <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              I understand and agree to the recording consent requirements
            </label>
          </div>
          {errors.consent && (
            <p className="text-xs text-red-500">{errors.consent.message}</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 animate-fade-up">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || !consentChecked}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-500" style={{ transition: 'color 150ms ease-out' }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
