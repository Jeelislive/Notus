import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/**
 * Safe wrapper around auth.api.getSession().
 * Better Auth throws APIError when the session cookie is present but stale/missing in DB.
 * Returns null instead of throwing so callers can redirect gracefully.
 */
export async function getSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch {
    return null
  }
}
