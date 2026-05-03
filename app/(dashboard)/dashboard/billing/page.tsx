import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getUserUsage, FREE_MINUTES } from '@/lib/billing'
import { BillingClient } from '@/components/dashboard/billing-client'

export default async function BillingPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const usage = await getUserUsage(session.user.id)

  return (
    <BillingClient
      minutesUsed={usage.minutesUsed}
      minutesLimit={FREE_MINUTES}
      isPro={usage.isPro}
      userEmail={session.user.email}
      userName={session.user.name ?? ''}
    />
  )
}
