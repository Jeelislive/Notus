import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await request.json()

  // Subscription signature: HMAC-SHA256(payment_id|subscription_id)
  const body = `${razorpay_payment_id}|${razorpay_subscription_id}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  await db.update(profiles).set({
    planType: 'pro',
    planExpiresAt: null, // null = active subscription (no hard expiry)
    razorpaySubscriptionId: razorpay_subscription_id,
    updatedAt: new Date(),
  }).where(eq(profiles.id, session.user.id))

  return NextResponse.json({ success: true })
}
