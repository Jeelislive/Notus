# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (may use port 3001 if 3000 is taken)
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

## Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **Auth**: Better Auth 1.5.5 - email/password + Google OAuth
- **Database**: PostgreSQL via Supabase, Drizzle ORM, postgres-js (max 3 connections)
- **Styling**: Tailwind CSS 4 + Radix UI primitives + next-themes (dark/light)
- **Email**: Resend + React Email (password reset only)
- **Forms**: React Hook Form + Zod
- **Editor**: Tiptap (rich text, task lists, character count)

## Architecture

### Route Groups

| Group | Path | Auth |
|-------|------|------|
| Root | `/` | Public - landing page only |
| `(auth)` | `/login`, `/signup`, `/forgot-password`, `/reset-password` | Redirects authenticated users to `/dashboard` |
| `(dashboard)` | `/dashboard/*` | Session required - middleware redirects to `/login` |

### Auth Flow

- **Middleware** (`middleware.ts`) checks session cookie. `/dashboard/*` requires session; auth pages redirect authenticated users away.
- **Session helper** (`lib/session.ts`): `getSession()` wraps Better Auth, returns `null` on failure - safe to call in server components.
- **Auth API**: All Better Auth endpoints handled at `/api/auth/[...all]/route.ts`.
- **Profile auto-creation**: `lib/auth.ts` uses a `databaseHooks.user.create.after` hook to create a `profiles` row when a new auth user is created.

### Data Layer

- **Schema** (`lib/db/schema.ts`): Better Auth tables (`user`, `session`, `account`, `verification`) + app tables (`profiles`, `teams`, `team_members`, `meetings`, `transcript_segments`, `notes`, `templates`, `usage_tracking`).
- **Queries** (`lib/db/queries.ts`): Typed query helpers used in server components - no client-side fetching.
- **Server Actions** (`app/actions/meetings.ts`, `app/actions/templates.ts`): All mutations go through `'use server'` actions. Every action verifies user ownership before mutating.

### Key Patterns

- Pages are **server components** by default; `'use client'` only for interactive UI.
- Database connection is a **global singleton** (`lib/db/index.ts`) to prevent HMR connection leaks.
- Landing page components live in `components/landing/` - all sections use `section-reveal` CSS class + `IntersectionObserver` for scroll animations.
- Dashboard UI uses `components/dashboard/` with a sidebar layout defined in `app/(dashboard)/layout.tsx`.
- Theme switching is handled by `components/theme-switcher.tsx` using next-themes.

## Environment Variables

```env
DATABASE_URL=
BETTER_AUTH_URL=
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
