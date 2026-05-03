'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Props {
  open: boolean
  onClose: () => void
  minutesUsed: number
  minutesLimit: number
  userEmail: string
  userName: string
}

export function UpgradeModal({ open, onClose, minutesUsed, minutesLimit, userEmail, userName }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
            onClose()
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4" />
            You&apos;ve hit your limit
          </DialogTitle>
        </DialogHeader>
        <p className="text-[14px] text-muted-foreground">
          You&apos;ve used <strong className="text-foreground">{minutesUsed} of {minutesLimit} free minutes</strong> this month. Upgrade to Pro for unlimited recording.
        </p>
        <div className="rounded-xl border border-border bg-muted/30 p-4 mt-1">
          <p className="text-[13px] font-semibold text-foreground mb-0.5">Pro — ₹999/month</p>
          <p className="text-[12px] text-muted-foreground">Unlimited recording · AI notes · Unlimited folders · Translation</p>
        </div>
        <div className="flex gap-2 mt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Maybe later</Button>
          <Button onClick={handleUpgrade} disabled={loading} className="flex-1">
            {loading ? 'Processing…' : 'Upgrade now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
