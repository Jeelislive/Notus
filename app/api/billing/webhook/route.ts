import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const entity = event.payload?.subscription?.entity
  const userId = entity?.notes?.userId

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      if (userId) {
        await db.update(profiles).set({
          planType: 'pro',
          planExpiresAt: null,
          razorpaySubscriptionId: entity.id,
          updatedAt: new Date(),
        }).where(eq(profiles.id, userId))
      }
      break
    }

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.halted': {
      if (userId) {
        // Keep pro until end of current billing cycle if possible
        const cycleEnd = entity.current_end ? new Date(entity.current_end * 1000) : new Date()
        await db.update(profiles).set({
          planType: cycleEnd > new Date() ? 'pro' : 'free',
          planExpiresAt: cycleEnd > new Date() ? cycleEnd : null,
          razorpaySubscriptionId: null,
          updatedAt: new Date(),
        }).where(eq(profiles.id, userId))
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
