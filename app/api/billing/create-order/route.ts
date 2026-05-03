import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID!,
      total_count: 120, // max 10 years; effectively unlimited
      quantity: 1,
      notes: { userId: session.user.id, email: session.user.email },
    })

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (err) {
    console.error('[billing/create-subscription]', err)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}
