import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
  profiles,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: user.email,
        subject: 'Reset your Notus password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#e8e8ea">Reset your password</h2>
            <p style="color:#a1a1aa">Click below to reset your Notus password. Expires in 1 hour.</p>
            <a href="${url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset password</a>
            <p style="color:#71717a;font-size:12px">If you didn't request this, ignore this email.</p>
          </div>
        `,
      })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const existing = await db.query.profiles.findFirst({
            where: eq(profiles.id, user.id),
          })
          if (!existing) {
            await db.insert(profiles).values({
              id: user.id,
              email: user.email,
              fullName: user.name ?? null,
              avatarUrl: user.image ?? null,
              emailVerified: user.emailVerified,
            })
          }
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
