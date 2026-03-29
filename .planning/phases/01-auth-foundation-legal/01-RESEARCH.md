# Phase 1: Auth + Foundation + Legal - Research

**Researched:** 2026-03-21
**Domain:** Supabase Auth + Next.js 15 App Router + Drizzle ORM schema + GDPR consent
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | Supabase `signUp()` with email + password; verified callback route exchanges code for session |
| AUTH-02 | User can log in with email and password and stay logged in across sessions | Supabase `signInWithPassword()`; `@supabase/ssr` middleware handles session refresh via cookies |
| AUTH-03 | User can log in with Google OAuth (one-click) | `signInWithOAuth({ provider: 'google' })` with redirectTo callback; Google Cloud Console OAuth setup |
| AUTH-04 | User can reset password via email link | Supabase `resetPasswordForEmail()` + `updateUser()` on new password page; Resend for custom email templates |
| AUTH-05 | User can log out from any page | `supabase.auth.signOut()` in Server Action; middleware clears cookies |
| AUTH-06 | User receives email verification after signup (before recording is allowed) | Supabase email confirmation flow; gate recording routes by `email_confirmed_at` check; middleware enforces gate |
</phase_requirements>

---

## Summary

Phase 1 establishes the complete technical foundation for the Granola clone: working authentication, a production-ready Postgres schema with migrations, GDPR recording consent, and an email verification gate. The stack is Supabase Auth with `@supabase/ssr` for Next.js 15 App Router, Drizzle ORM for type-safe schema definition and migrations, Tailwind CSS 4 with shadcn/ui for components, and Resend + React Email for transactional emails.

The most critical Next.js 15 breaking change affecting this phase is that `cookies()`, `headers()`, and `params` are now async - every server-side Supabase client creation must `await cookies()` before passing to `createServerClient`. The middleware pattern must also call `await supabase.auth.getUser()` (not `getSession()`) to refresh tokens. Using `getSession()` in server code is a security vulnerability because it reads unvalidated JWT data from cookies without verifying against Supabase's public keys.

Drizzle ORM integrates with Supabase by connecting directly to Supabase's Postgres via the connection string. Since Supabase manages auth (not Drizzle), the schema for `auth.users` is Supabase-owned - the application schema references it via foreign keys. RLS policies are defined in SQL migrations (via `drizzle-kit`) and Drizzle queries run through the Supabase anon/service role clients. For Phase 1, the full 8-table schema must be defined upfront including FTS indexes, because retrofitting schema across phases is painful.

**Primary recommendation:** Use `@supabase/ssr` `createServerClient` in middleware with `await cookies()` pattern, define Drizzle schema for all Phase 1–8 tables now with FTS indexes, implement GDPR recording consent in the signup onboarding step (not a cookie banner - it's a terms acceptance for recording third parties), and gate all recording routes by `email_confirmed_at`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.x | Supabase client for auth + DB queries | Official Supabase client library |
| `@supabase/ssr` | ^0.5.x | SSR-compatible cookie-based auth for Next.js | Required for App Router - replaces deprecated `auth-helpers-nextjs` |
| `drizzle-orm` | ^0.36.x | Type-safe ORM for Postgres schema + queries | TypeScript-native, lightweight, works with Supabase Postgres |
| `drizzle-kit` | ^0.27.x | Schema migration tooling | Generates SQL migrations from Drizzle schema definitions |
| `postgres` | ^3.4.x | Postgres driver for Drizzle | Recommended driver for Drizzle + Supabase |
| `next` | ^15.x | App Router framework | Project constraint; async Request APIs required |
| `tailwindcss` | ^4.x | CSS utility framework | Project constraint; v4 uses `@import` not `tailwind.config.ts` |
| `@tailwindcss/postcss` | ^4.x | PostCSS plugin for Tailwind 4 | Required for Tailwind 4 compilation |
| `tw-animate-css` | latest | Animation utilities | Replaces deprecated `tailwindcss-animate` in Tailwind 4 |
| `resend` | ^4.x | Transactional email sending | Simplest Resend SDK |
| `react-email` | ^3.x | React components for email templates | Official React Email templating |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-email/components` | latest | Prebuilt email components | Building verification/reset email templates |
| `dotenv` | ^16.x | Environment variable loading for drizzle-kit | Needed for `drizzle.config.ts` |
| `zod` | ^3.x | Runtime validation for auth forms | Validate signup/login form inputs |
| `react-hook-form` | ^7.x | Form state management | Auth forms (signup, login, reset password) |
| `@hookform/resolvers` | ^3.x | Zod resolver for react-hook-form | Connect zod schemas to form validation |
| `sonner` | ^1.x | Toast notifications | Shadcn recommends over `toast`; show auth errors/success |
| `nanoid` | ^5.x | Generate share tokens | Used for meeting share tokens defined in Phase 1 schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/ssr` | NextAuth v5 | NextAuth adds config complexity; Supabase Auth is already bundled with the DB - no reason to add another auth provider |
| Drizzle ORM | Prisma | Prisma is heavier, slower cold starts, less TypeScript-native; Drizzle is the right choice for this stack |
| Resend | Supabase built-in email | Supabase's SMTP can handle verification emails, but Resend is required for custom transactional emails (password reset templates, AI-ready notifications) |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr drizzle-orm postgres drizzle-kit dotenv resend react-email @react-email/components zod react-hook-form @hookform/resolvers sonner nanoid tw-animate-css
npm install --save-dev drizzle-kit
```

---

## Architecture Patterns

### Recommended Project Structure
```
granola/
├── app/
│   ├── (auth)/                    # Auth route group (no nav shell)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── verify-email/
│   │       └── page.tsx           # "Check your email" holding page
│   ├── (app)/                     # App route group (requires auth + email_confirmed)
│   │   ├── layout.tsx             # Auth gate enforced here
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Placeholder for Phase 2
│   │   └── onboarding/
│   │       └── page.tsx           # GDPR recording consent step
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts           # OAuth + email verification callback
│   ├── layout.tsx                 # Root layout with Toaster
│   └── globals.css                # Tailwind 4 @import directives
├── components/
│   ├── ui/                        # shadcn/ui components
│   └── auth/                      # Auth-specific components
│       ├── login-form.tsx
│       ├── signup-form.tsx
│       ├── forgot-password-form.tsx
│       └── google-oauth-button.tsx
├── emails/                        # React Email templates
│   ├── verification-email.tsx
│   └── password-reset-email.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # createClient for Server Components/Actions/Routes
│   │   └── client.ts             # createBrowserClient for Client Components
│   ├── db/
│   │   ├── index.ts              # Drizzle db instance
│   │   └── schema.ts            # All table definitions (Phase 1-8 schema)
│   └── email/
│       └── send.ts              # Resend wrapper
├── middleware.ts                  # Token refresh + route protection
└── drizzle.config.ts             # Drizzle-kit configuration
```

### Pattern 1: Next.js 15 Middleware with Supabase Auth
**What:** Middleware refreshes Supabase auth tokens on every request and protects routes.
**When to use:** Every Next.js 15 + Supabase App Router project. This is mandatory.

```typescript
// middleware.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Use getUser() not getSession() - validates JWT signature
  const { data: { user } } = await supabase.auth.getUser()

  // Protect app routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Gate recording routes by email verification
  if (user && !user.email_confirmed_at &&
      request.nextUrl.pathname.startsWith('/meeting')) {
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 2: Server Client Creation (Next.js 15 async cookies)
**What:** Create a Supabase client for Server Components, Server Actions, and Route Handlers.
**When to use:** Any server-side code that needs auth or DB access.

```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// CRITICAL: cookies() is async in Next.js 15 - must await
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - cookie setting is handled by middleware
          }
        },
      },
    }
  )
}
```

### Pattern 3: Auth Callback Route Handler
**What:** Single route that handles both OAuth code exchange and email verification OTP.
**When to use:** After Google OAuth redirect and email verification link clicks.

```typescript
// app/auth/callback/route.ts
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  if (code) {
    // OAuth code exchange
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (token_hash && type) {
    // Email verification OTP
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth-error`)
}
```

### Pattern 4: Drizzle ORM Schema with Supabase
**What:** Define all application tables in Drizzle schema, referencing Supabase's auth.users.
**When to use:** All table definitions for the entire application go in schema.ts.

```typescript
// lib/db/schema.ts
// Source: https://orm.drizzle.team/docs/get-started/supabase-new
import {
  pgTable, uuid, text, timestamp, boolean, integer,
  pgEnum, index
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Reference Supabase auth.users table (managed by Supabase, not Drizzle)
// Foreign keys reference auth.users(id) via uuid

export const planEnum = pgEnum('plan', ['free', 'pro'])
export const meetingStatusEnum = pgEnum('meeting_status', [
  'idle', 'recording', 'processing', 'done'
])
export const teamRoleEnum = pgEnum('team_role', ['owner', 'admin', 'member'])
export const integrationProviderEnum = pgEnum('integration_provider', [
  'slack', 'notion', 'hubspot'
])

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // References auth.users(id)
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  plan: planEnum('plan').default('free').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  recordingConsentAt: timestamp('recording_consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: uuid('owner_id').notNull(), // References profiles(id)
  plan: planEnum('plan').default('free').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // References profiles(id)
  role: teamRoleEnum('role').default('member').notNull(),
})

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // References profiles(id)
  teamId: uuid('team_id').references(() => teams.id),
  title: text('title').default('Untitled Meeting').notNull(),
  status: meetingStatusEnum('status').default('idle').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  templateId: uuid('template_id'),
  shareToken: text('share_token').unique(),
  shareEnabled: boolean('share_enabled').default(false).notNull(),
  visibility: text('visibility').default('private').notNull(), // private | team | public
  calendarEventId: text('calendar_event_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('meetings_user_id_idx').on(table.userId),
  teamIdIdx: index('meetings_team_id_idx').on(table.teamId),
  // FTS index on meeting titles (declared in raw SQL migration)
}))

export const audioChunks = pgTable('audio_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  storagePath: text('storage_path').notNull(),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const transcriptSegments = pgTable('transcript_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  speakerLabel: text('speaker_label'),
  text: text('text').notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  confidence: integer('confidence'), // 0-100
  // tsvector column added via raw SQL migration for FTS
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  meetingIdIdx: index('transcript_segments_meeting_id_idx').on(table.meetingId),
}))

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }).unique(),
  content: text('content'), // Tiptap JSON serialized as text
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const aiOutputs = pgTable('ai_outputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // summary | action_items | follow_up | chat
  prompt: text('prompt'),
  content: text('content').notNull(),
  model: text('model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'), // null = system template
  teamId: uuid('team_id').references(() => teams.id),
  name: text('name').notNull(),
  structure: text('structure').notNull(), // JSON
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  teamId: uuid('team_id').references(() => teams.id),
  provider: integrationProviderEnum('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  metadata: text('metadata'), // JSON
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usageTracking = pgTable('usage_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  billingPeriodStart: timestamp('billing_period_start', { withTimezone: true }).notNull(),
  recordingMinutes: integer('recording_minutes').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### Pattern 5: Drizzle Config with Supabase Connection Pooler
**What:** Configure Drizzle-kit to connect to Supabase Postgres.
**When to use:** Schema migration generation and deployment.

```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/supabase-new
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

```typescript
// lib/db/index.ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

// CRITICAL: prepare: false required for Supabase transaction mode pooler
const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
```

### Pattern 6: Tailwind CSS 4 Setup
**What:** Tailwind 4 uses `@import` in CSS, no `tailwind.config.ts`, no `@tailwind` directives.
**When to use:** All Next.js 15 + Tailwind 4 projects.

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

/* shadcn/ui theme variables */
@layer base {
  :root {
    --background: hsl(0 0% 100%);
    --foreground: hsl(222.2 84% 4.9%);
    /* ... other variables */
  }
}
```

### Pattern 7: Google OAuth Sign-In
**What:** Initiate Google OAuth flow with redirect back to auth callback.
**When to use:** Google one-click login button.

```typescript
// In a Server Action or client handler
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
const supabase = createBrowserClient(...)
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

### Anti-Patterns to Avoid

- **Using `getSession()` on the server:** `supabase.auth.getSession()` in Server Components or middleware reads JWT from cookies without verifying the signature - use `getClaims()` or `getUser()` instead. This is a critical security flaw.
- **Synchronously accessing `cookies()`:** In Next.js 15, `cookies()` returns a Promise. Accessing it synchronously will log warnings and break in Next.js 16. Always `await cookies()`.
- **Defining `params` as a plain object:** In Next.js 15, `params` in pages/layouts is `Promise<{ id: string }>` - always `await params` or use `React.use(params)` in Client Components.
- **Uploading audio through Route Handlers:** Not relevant to Phase 1, but the schema and storage bucket setup must account for direct-to-storage uploads (no Route Handler middleman) - design storage RLS accordingly.
- **Storing API keys in client components:** Supabase service key must NEVER be exposed. Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key) for browser clients; use service key only in Server Actions/Routes with `service_role` when RLS bypass is needed.
- **Putting consent checkbox in a cookie banner:** The GDPR requirement here is consent for *recording other people*, not cookie consent. This belongs in onboarding after signup - a mandatory acceptance step before accessing recording features.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token refresh | Custom JWT refresh logic | `@supabase/ssr` middleware | Handles token rotation, cookie management, and expiry automatically |
| Password reset flow | Custom token generation + expiry | `supabase.auth.resetPasswordForEmail()` | Supabase generates secure time-limited tokens; handles all edge cases |
| Email verification | Custom OTP generation | Supabase built-in email confirmation | Supabase sends verification emails automatically on signup |
| Google OAuth flow | Custom OAuth 2.0 implementation | `supabase.auth.signInWithOAuth()` | Supabase handles token exchange, PKCE, and session creation |
| Schema migrations | Custom SQL migration scripts | `drizzle-kit generate` + `drizzle-kit migrate` | Type-safe migrations with rollback support |
| Form validation | Custom regex validators | `zod` + `react-hook-form` | Handles edge cases, type inference, and error messages |
| Toast notifications | Custom notification component | `sonner` (shadcn recommended) | Accessible, animatable, production-quality |

**Key insight:** Supabase Auth handles the entire authentication lifecycle - token issuance, refresh, expiry, and revocation. Building any part of this manually introduces security vulnerabilities that Supabase's team has already addressed.

---

## Common Pitfalls

### Pitfall 1: `getSession()` vs `getUser()` / `getClaims()` in Server Code
**What goes wrong:** Using `supabase.auth.getSession()` in middleware or Server Components reads the JWT from cookies without cryptographic verification. An attacker can forge a session cookie and bypass auth checks.
**Why it happens:** `getSession()` is the intuitive API name - developers assume it's safe.
**How to avoid:** Always use `supabase.auth.getUser()` in middleware and `getClaims()` for Server Components when auth state is security-critical. The official Supabase docs (2025) explicitly state: "Never trust `supabase.auth.getSession()` inside server code."
**Warning signs:** Code like `const { data: { session } } = await supabase.auth.getSession()` used to check auth in middleware.

### Pitfall 2: Synchronous `cookies()` in Next.js 15
**What goes wrong:** `const cookieStore = cookies()` (without await) gives a deprecation warning in Next.js 15 and will break in Next.js 16. The Supabase server client creation will silently fail to set cookies.
**Why it happens:** Developers copy patterns from Next.js 14 docs or older tutorials.
**How to avoid:** Always `const cookieStore = await cookies()` in `lib/supabase/server.ts`. This is a one-line change that prevents a class of auth bugs.
**Warning signs:** Console warnings about `cookies() should be awaited` in development.

### Pitfall 3: Drizzle + Supabase Connection Pooler Prepared Statements
**What goes wrong:** Supabase's connection pooler in Transaction mode does not support PostgreSQL prepared statements. If `prepare: false` is not set in the postgres client, queries fail with cryptic prepared statement errors.
**Why it happens:** Drizzle's postgres driver uses prepared statements by default for performance.
**How to avoid:** Always add `{ prepare: false }` when creating the postgres client for Supabase: `const client = postgres(DATABASE_URL, { prepare: false })`.
**Warning signs:** `prepared statement ... does not exist` errors in production.

### Pitfall 4: Schema Created Without FTS Indexes
**What goes wrong:** Building the full meeting/transcript system in Phase 2+ without having added `tsvector` columns and GIN indexes from the start requires a table migration with data backfill on potentially large tables.
**Why it happens:** FTS feels like Phase 3-4 concern, not Phase 1.
**How to avoid:** Add FTS SQL to the Phase 1 migration: `ALTER TABLE transcript_segments ADD COLUMN ts tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED; CREATE INDEX transcript_segments_ts_idx ON transcript_segments USING gin(ts);` - same for meetings title column.
**Warning signs:** Adding FTS later requires `VACUUM` and index build on live table.

### Pitfall 5: Recording Consent as Cookie Banner
**What goes wrong:** Treating GDPR recording consent as a cookie consent banner (shown to all visitors) rather than as an onboarding step for authenticated users. Cookie banners don't capture consent for *recording third parties* - they cover analytics cookies.
**Why it happens:** "GDPR consent" pattern conflated with cookie consent.
**How to avoid:** Build a dedicated onboarding step (shown once after email verification) where the user reads and accepts a "Recording Consent" agreement. Store `recording_consent_at` timestamp in the `profiles` table. Gate recording features by checking this timestamp.
**Warning signs:** Recording available without any consent acceptance; only a cookie banner shown.

### Pitfall 6: Email Verification Gate Not Enforced Server-Side
**What goes wrong:** Checking email verification only in the UI allows a savvy user to navigate directly to `/meeting/new/record` after signup without verifying their email - the AUTH-06 requirement is bypassed.
**Why it happens:** Email verification check added to UI but not to middleware.
**How to avoid:** Add explicit middleware check: if `user.email_confirmed_at` is null and path starts with `/meeting` (or any recording path), redirect to `/verify-email`. This is enforced before the page renders.
**Warning signs:** Users can access recording routes without verifying email by typing the URL directly.

### Pitfall 7: Supabase Auth Callback URL Not in Allow List
**What goes wrong:** Google OAuth or email verification redirects to a URL not in Supabase's "Redirect URLs" allow list. The user gets an error page after authentication.
**Why it happens:** Developers forget to add `http://localhost:3000/**` and their production URL to Supabase Dashboard → Authentication → URL Configuration.
**How to avoid:** Add both local dev (`http://localhost:3000/**`) and production (`https://yourdomain.com/**`) URLs before testing OAuth. Use wildcard patterns.
**Warning signs:** "Invalid redirect URL" error after OAuth login attempt.

### Pitfall 8: Tailwind 4 `tailwind.config.ts` Habit
**What goes wrong:** Creating a `tailwind.config.ts` file out of habit from Tailwind 3. In Tailwind 4, configuration is done via `@theme` in CSS - the config file is not used.
**Why it happens:** Muscle memory from Tailwind 3 projects.
**How to avoid:** No `tailwind.config.ts` needed. Use `@theme inline { --color-brand: oklch(…); }` in `globals.css` for custom values. Use `@tailwindcss/postcss` plugin in `postcss.config.mjs`.
**Warning signs:** Custom colors/fonts defined in `tailwind.config.ts` not applied at runtime.

### Pitfall 9: Profiles Table Not Auto-Created on Signup
**What goes wrong:** Supabase creates a user in `auth.users` on signup, but does NOT automatically create a corresponding row in your `profiles` table. Pages that join on `profiles` will get null or throw.
**Why it happens:** Developers assume Supabase manages the application profile automatically.
**How to avoid:** Create a Postgres function + trigger: `CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$ BEGIN INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER; CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();` - add this to the Phase 1 migration.
**Warning signs:** `null` returned for user profile lookups immediately after signup.

---

## Code Examples

### Email Signup with Supabase

```typescript
// Server Action: app/(auth)/signup/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Redirect to "check your email" page
  redirect('/verify-email')
}
```

### Password Reset

```typescript
// Source: Supabase Auth docs
export async function resetPassword(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  })
  return { error }
}

// On the reset-password page, after user submits new password:
export async function updatePassword(newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}
```

### FTS Migration SQL (add to drizzle migration)

```sql
-- Add to the migration file generated by drizzle-kit
-- FTS on transcript_segments
ALTER TABLE transcript_segments
  ADD COLUMN ts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;

CREATE INDEX transcript_segments_ts_idx
  ON transcript_segments USING gin(ts);

-- FTS on meetings titles
ALTER TABLE meetings
  ADD COLUMN ts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title)) STORED;

CREATE INDEX meetings_ts_idx
  ON meetings USING gin(ts);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Supabase RLS Policy Example

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Meetings: users can only access their own meetings
CREATE POLICY "Users can view own meetings"
  ON meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meetings"
  ON meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings"
  ON meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings"
  ON meetings FOR DELETE
  USING (auth.uid() = user_id);
```

### Resend Email Sending

```typescript
// lib/email/send.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(to: string, verificationUrl: string) {
  await resend.emails.send({
    from: 'Granola <noreply@yourdomain.com>',
    to,
    subject: 'Verify your email',
    react: VerificationEmail({ verificationUrl }),
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers deprecated; `@supabase/ssr` is the correct package for App Router |
| `cookies()` synchronous | `await cookies()` | Next.js 15 (Oct 2024) | Must await all request APIs; sync access warns in v15, breaks in v16 |
| `tailwind.config.ts` | `@import "tailwindcss"` in CSS | Tailwind 4 (Jan 2025) | No config file needed; auto-scanning; PostCSS plugin required |
| `tailwindcss-animate` | `tw-animate-css` | Mar 2025 | `tailwindcss-animate` deprecated with Tailwind 4 |
| `supabase.auth.getSession()` | `supabase.auth.getUser()` / `getClaims()` | 2024 Supabase security update | `getSession()` unsafe in server code - does not verify JWT signature |
| `params.slug` direct access | `await params` then `.slug` | Next.js 15 | params is now `Promise<{slug: string}>` in all file conventions |
| shadcn `toast` component | `sonner` | 2025 | shadcn deprecated `toast` in favor of Sonner integration |
| GET Route Handlers cached by default | Not cached by default | Next.js 15 | Add `export const dynamic = 'force-static'` to opt into caching |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Fully deprecated - do not use. Use `@supabase/ssr`.
- `tailwindcss-animate`: Deprecated as of Tailwind 4 - use `tw-animate-css`.
- `supabase.auth.getSession()` in server code: Security antipattern - use `getUser()`.
- Synchronous `cookies()`: Works with warning in Next.js 15, breaks in Next.js 16.

---

## Open Questions

1. **Supabase `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vs `NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - What we know: The Supabase docs reference `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in newer docs but `NEXT_PUBLIC_SUPABASE_ANON_KEY` in older docs
   - What's unclear: Whether these are the same key with a renamed env var, or a new distinct key type
   - Recommendation: Check the actual Supabase project dashboard. Use whatever key name the Supabase dashboard shows - they are functionally the same anon/publishable key, likely just renamed in docs.

2. **Drizzle + RLS: Use Drizzle's built-in `pgPolicy()` or raw SQL migrations**
   - What we know: Drizzle 0.36+ has `pgPolicy()` and `pgRole()` in its schema DSL for defining RLS. Alternatively, RLS policies can be in raw SQL added to migration files.
   - What's unclear: Whether Drizzle's `pgPolicy()` is stable enough for production use vs. raw SQL migrations
   - Recommendation: Use raw SQL in migration files for RLS policies - more explicit, easier to audit, not dependent on Drizzle's RLS DSL stability.

3. **Custom email templates for Supabase verification emails**
   - What we know: Supabase sends verification/reset emails by default from its own SMTP. Custom templates can be configured in the Supabase dashboard (HTML only, no React). Resend can be used for custom transactional emails but cannot replace Supabase's internal OTP emails without custom SMTP config.
   - What's unclear: Whether to configure Supabase to use Resend as SMTP provider (so Supabase's auth emails come from your domain) or rely on Supabase's default emails for verification and use Resend only for app emails
   - Recommendation: Configure Supabase to use Resend as custom SMTP in the dashboard. This gives consistent branding and your own sending domain for all auth emails. Steps: Supabase Dashboard → Project Settings → Auth → SMTP Settings → enter Resend SMTP credentials.

---

## Sources

### Primary (HIGH confidence)
- [Supabase SSR Next.js Setup](https://supabase.com/docs/guides/auth/server-side/nextjs) - middleware pattern, server client creation, getClaims vs getSession security note
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) - callback URL setup, signInWithOAuth, redirect allow list
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15) - async Request APIs breaking changes, params/cookies/headers patterns
- [Drizzle ORM Supabase Guide](https://orm.drizzle.team/docs/get-started/supabase-new) - connection string, `prepare: false`, drizzle.config.ts
- [Drizzle ORM RLS Guide](https://orm.drizzle.team/docs/rls) - pgPolicy DSL and JWT transaction pattern
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4) - CSS import changes, OKLCH colors, tw-animate-css, deprecated toast → sonner

### Secondary (MEDIUM confidence)
- [Supabase Drizzle Integration](https://supabase.com/docs/guides/database/drizzle) - verified connection pooler + `prepare: false` requirement
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4) - confirmed no config file, @import syntax, auto-scanning
- Makerkit Drizzle + Supabase guide - dual-client (admin/RLS) architecture pattern

### Tertiary (LOW confidence - validate during execution)
- RLS with Drizzle in production - the `pgPolicy()` DSL stability is not fully verified; raw SQL fallback is safer
- Resend as Supabase custom SMTP - configuration steps not verified against current Supabase dashboard UI

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified against official docs; versions confirmed current
- Architecture: HIGH - Patterns verified against official Supabase + Next.js 15 docs; auth callback and middleware verified against source
- Pitfalls: HIGH - Most pitfalls verified against official docs (getUser vs getSession, async cookies); Drizzle prepare:false verified against Supabase + Drizzle docs
- GDPR consent approach: MEDIUM - GDPR recording consent as onboarding step (not cookie banner) is legally correct interpretation but specific UI requirements may need legal review

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days; Supabase SSR API is stable, Next.js 15 breaking changes are now stable)
