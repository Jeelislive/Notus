import { db } from '@/lib/db'
import { meetings, profiles } from '@/lib/db/schema'
import { and, eq, gte, sum } from 'drizzle-orm'

export const FREE_MINUTES = 60
export const PRO_PRICE_INR = 99900 // ₹999 in paise

export function getBillingPeriodStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function getUserUsage(userId: string): Promise<{ minutesUsed: number; minutesLimit: number; isPro: boolean }> {
  const [profile, usageResult] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.id, userId) }),
    db.select({ total: sum(meetings.durationSeconds) })
      .from(meetings)
      .where(and(eq(meetings.userId, userId), gte(meetings.createdAt, getBillingPeriodStart()))),
  ])

  const isPro = profile?.planType === 'pro' && (!profile.planExpiresAt || profile.planExpiresAt > new Date())
  const secondsUsed = Number(usageResult[0]?.total ?? 0)
  const minutesUsed = Math.ceil(secondsUsed / 60)

  return {
    minutesUsed,
    minutesLimit: isPro ? Infinity : FREE_MINUTES,
    isPro,
  }
}

export async function canRecord(userId: string): Promise<{ allowed: boolean; minutesUsed: number; minutesLimit: number; isPro: boolean }> {
  const usage = await getUserUsage(userId)
  return {
    ...usage,
    allowed: usage.isPro || usage.minutesUsed < usage.minutesLimit,
  }
}
