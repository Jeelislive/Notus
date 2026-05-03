'use client'

import { useState } from 'react'
import { Check, Zap, Mic, Sparkles, Folder, Mail, Globe, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const FREE_FEATURES = [
  { icon: Mic, text: '60 minutes of recording/month' },
  { icon: Check, text: 'Live transcription' },
  { icon: Check, text: 'Basic notes editor' },
  { icon: Check, text: '1 folder' },
]

const PRO_FEATURES = [
  { icon: Mic, text: 'Unlimited recording minutes' },
  { icon: Sparkles, text: 'AI notes generation' },
  { icon: Sparkles, text: 'AI summary + action items' },
  { icon: Folder, text: 'Unlimited folders' },
  { icon: Mail, text: 'Follow-up email generation' },
  { icon: Globe, text: 'Language translation' },
  { icon: MessageSquare, text: 'Chat assistant per meeting' },
]

interface Props {
  minutesUsed: number
  minutesLimit: number
  isPro: boolean
  userEmail: string
  userName: string
}

export function BillingClient({ minutesUsed, minutesLimit, isPro, userEmail, userName }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const usagePct = Math.min((minutesUsed / minutesLimit) * 100, 100)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/create-order', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await new Promise<void>((resolve, reject) => {
        if (document.getElementById('razorpay-script')) { resolve(); return }
        const script = document.createElement('script')
        script.id = 'razorpay-script'
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Razorpay'))
        document.body.appendChild(script)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Notus',
        description: 'Pro Plan — ₹999/month',
        prefill: { name: userName, email: userEmail },
        theme: { color: '#000000' },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          if (verifyRes.ok) {
            toast('Upgraded to Pro!', { variant: 'success' })
            router.refresh()
          } else {
            toast('Payment verification failed', { variant: 'destructive' })
          }
        },
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      toast('Something went wrong', { variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-[28px] font-semibold text-foreground mb-1" style={{ letterSpacing: '-0.02em' }}>Billing</h1>
        <p className="text-[14px] text-muted-foreground">Manage your plan and usage</p>
      </div>

      {/* Usage bar */}
      <div className="mb-10 p-5 rounded-2xl border border-border bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-foreground">Recording usage this month</p>
          <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${isPro ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-[32px] font-bold text-foreground tabular-nums leading-none">{minutesUsed}</span>
          <span className="text-[14px] text-muted-foreground mb-1">/ {isPro ? '∞' : minutesLimit} mins</span>
        </div>
        {!isPro && (
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-foreground'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Free */}
        <div className={`rounded-2xl border p-6 ${!isPro ? 'border-foreground/30 bg-muted/20' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[15px] font-semibold text-foreground">Free</p>
            {!isPro && <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Current plan</span>}
          </div>
          <p className="text-[28px] font-bold text-foreground mb-1">₹0<span className="text-[14px] font-normal text-muted-foreground">/mo</span></p>
          <p className="text-[12px] text-muted-foreground mb-5">Get started for free</p>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                <f.icon className="size-3.5 shrink-0 text-muted-foreground/60" />
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className={`rounded-2xl border p-6 relative overflow-hidden ${isPro ? 'border-foreground/30 bg-muted/20' : 'border-foreground bg-foreground text-background'}`}>
          <div className="absolute top-3 right-3">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isPro ? 'bg-emerald-500/15 text-emerald-500' : 'bg-background/15 text-background'}`}>
              {isPro ? 'Current plan' : 'Most popular'}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className={`size-4 ${isPro ? 'text-foreground' : 'text-background'}`} />
            <p className={`text-[15px] font-semibold ${isPro ? 'text-foreground' : 'text-background'}`}>Pro</p>
          </div>
          <p className={`text-[28px] font-bold mb-1 ${isPro ? 'text-foreground' : 'text-background'}`}>
            ₹999<span className={`text-[14px] font-normal ${isPro ? 'text-muted-foreground' : 'text-background/70'}`}>/mo</span>
          </p>
          <p className={`text-[12px] mb-5 ${isPro ? 'text-muted-foreground' : 'text-background/70'}`}>Everything in Free, plus:</p>
          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((f, i) => (
              <li key={i} className={`flex items-center gap-2.5 text-[13px] ${isPro ? 'text-muted-foreground' : 'text-background/80'}`}>
                <f.icon className={`size-3.5 shrink-0 ${isPro ? 'text-muted-foreground/60' : 'text-background/60'}`} />
                {f.text}
              </li>
            ))}
          </ul>
          {!isPro && (
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-background text-foreground hover:bg-background/90"
            >
              {loading ? 'Processing…' : 'Upgrade to Pro — ₹999/mo'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
