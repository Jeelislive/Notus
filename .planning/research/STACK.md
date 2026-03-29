# Stack Research: AI Meeting Notes SaaS

**Domain:** AI meeting notes / audio transcription SaaS (Next.js + TypeScript)
**Date:** 2026-03-21

---

## Recommended Stack

### Core Framework
| Layer | Choice | Version | Confidence |
|-------|--------|---------|------------|
| Framework | Next.js | 15.x | High |
| Language | TypeScript | 5.x | High |
| UI | React | 19 | High |
| Styling | Tailwind CSS | 4.x | High |
| Component lib | shadcn/ui | latest | High |

**Rationale:** Next.js 15 App Router is the standard for SaaS in 2025. React 19 concurrent features help with streaming AI responses. Tailwind + shadcn/ui gives production-quality UI with minimal effort.

**Next.js 15 breaking changes to know:**
- Async Request APIs - `cookies()`, `headers()`, `params` are now async
- GET Route Handlers no longer cached by default
- These affect SST streaming routes and auth middleware

---

### Speech-to-Text (STT)
| Choice | Verdict |
|--------|---------|
| **Deepgram Nova-2** | ✅ Recommended |
| OpenAI Whisper API | ✗ Batch-only, no real-time streaming |
| AssemblyAI | ✗ Higher latency, more expensive |
| Rev.ai | ✗ Less developer-friendly |

**Rationale:** Deepgram Nova-2 supports WebSocket-based real-time streaming - critical for live transcription during meetings. Highest accuracy in 2025 benchmarks. SDK: `@deepgram/sdk`.

**Confidence: High**

---

### Audio Capture (Browser)
| API | Notes |
|-----|-------|
| `getDisplayMedia()` | Tab audio - Chrome/Edge only ⚠️ |
| `getUserMedia()` | Mic audio - all browsers |
| `recordrtc` | Cross-browser MediaRecorder normalization |
| `MediaRecorder` | Native API, inconsistent browser support |

**Key constraint:** `getDisplayMedia` tab audio capture is Chrome/Edge only. Safari does not support it. Firefox requires video alongside audio. This must be communicated clearly to users (Chrome required for tab audio).

**Recommendation:** Use `recordrtc` library for MediaRecorder normalization. For tab audio, require Chrome/Edge. For mic-only, all browsers work.

**Confidence: High (confirmed via MDN)**

---

### LLM Integration
| Choice | Verdict |
|--------|---------|
| **Claude (Haiku/Sonnet) via Vercel AI SDK v4** | ✅ Recommended |
| OpenAI GPT-4o | ✅ Valid alternative |
| Google Gemini | ✗ Less mature SDK |

**Rationale:** Vercel AI SDK v4 (`ai` package) is the standard for Next.js LLM integration. Pattern: `streamText()` → `toDataStreamResponse()` → `useCompletion()` on client. Works seamlessly with App Router Route Handlers.

**SDK:** `ai`, `@ai-sdk/anthropic` (or `@ai-sdk/openai`)

**Confidence: High**

---

### Database
| Choice | Verdict |
|--------|---------|
| **Supabase (Postgres)** | ✅ Recommended |
| Neon | ✗ DB only - need separate auth, storage, realtime |
| PlanetScale | ✗ MySQL, deprecated free tier |
| Railway Postgres | ✗ DB only |

**Rationale:** Supabase bundles Postgres + Auth (Google OAuth + email/password) + Realtime + Storage in one service. Eliminates 3 separate integrations for v1. Generous free tier. `@supabase/ssr` package is the correct Next.js 15 App Router integration.

**Confidence: High**

---

### ORM
| Choice | Verdict |
|--------|---------|
| **Drizzle ORM** | ✅ Recommended |
| Prisma | ✗ Heavier, slower, less TypeScript-native |
| Kysely | ✗ No schema management |

**Rationale:** Drizzle is TypeScript-native, lightweight, and has excellent Supabase integration. Schema defined in TypeScript. Migrations via `drizzle-kit`. `drizzle-orm` + `drizzle-kit`.

**Confidence: High**

---

### Authentication
| Choice | Verdict |
|--------|---------|
| **Supabase Auth** | ✅ Recommended |
| Clerk | ✗ Per-MAU pricing gets expensive |
| NextAuth v5 | ✗ More config, separate from DB |
| Better Auth | ✗ Newer, less battle-tested |

**Rationale:** Supabase Auth is included with Supabase, supports Google OAuth + email/password + magic links. `@supabase/ssr` package for App Router middleware.

**Confidence: High**

---

### Payments
| Choice | Verdict |
|--------|---------|
| **Stripe** | ✅ Recommended |
| Paddle | ✗ Better for global tax, overkill for v1 |
| Lemon Squeezy | ✗ Less mature |

**Features needed:** Stripe Checkout, Customer Portal (self-serve plan changes), Webhooks, Subscriptions. SDK: `stripe` (server) + `@stripe/stripe-js` (client).

**Confidence: High**

---

### File Storage (Audio)
| Choice | Verdict |
|--------|---------|
| **Supabase Storage** | ✅ Recommended (bundled) |
| AWS S3 | ✗ Separate setup, more config |
| Cloudflare R2 | ✗ Valid but adds vendor |

**Rationale:** Supabase Storage is included. Audio files stored with Row Level Security tied to user auth.

---

### Deployment
| Choice | Verdict |
|--------|---------|
| **Vercel** | ✅ Recommended |
| Railway | ✗ Good but less Next.js optimized |
| Fly.io | ✗ More DevOps overhead |

**Rationale:** Vercel is the natural fit for Next.js - zero-config deployments, edge functions, preview deployments.

---

### Email
| Choice | Verdict |
|--------|---------|
| **Resend** | ✅ Recommended |
| SendGrid | ✗ Overkill for v1 |
| Postmark | ✓ Valid alternative |

**SDK:** `resend`, `react-email` for templates

---

### Real-time
- **Supabase Realtime** - for collaborative note editing, live transcript updates
- **Server-Sent Events (SSE)** - for AI streaming responses via Vercel AI SDK

---

### Background Jobs
| Choice | Verdict |
|--------|---------|
| **Vercel Cron + Queue** | ✅ Simple for v1 |
| BullMQ + Redis | ✓ Better for scale |
| Inngest | ✓ Great DX, serverless-native |

**Recommendation:** Start with Inngest for background AI processing jobs (reliable, retryable, serverless-native).

---

## Full Stack Summary

```
Next.js 15 (App Router) + TypeScript 5 + React 19
├── UI: Tailwind CSS 4 + shadcn/ui
├── Auth: Supabase Auth + @supabase/ssr
├── DB: Supabase Postgres + Drizzle ORM
├── Storage: Supabase Storage (audio files)
├── Realtime: Supabase Realtime
├── Audio: getDisplayMedia + recordrtc
├── STT: Deepgram Nova-2 (WebSocket)
├── LLM: Claude/GPT-4o via Vercel AI SDK v4
├── Payments: Stripe (Checkout + Customer Portal)
├── Email: Resend + React Email
├── Background jobs: Inngest
└── Deploy: Vercel
```

---

## What NOT to Use

| Tool | Why Not |
|------|---------|
| Prisma | Heavier than Drizzle, slower type generation |
| Clerk | MAU-based pricing scales poorly |
| NextAuth v5 | Extra config when Supabase Auth is already included |
| OpenAI Whisper | No real-time streaming support |
| Self-hosted Postgres | DevOps overhead for v1 |
| AWS S3 | Extra vendor when Supabase Storage is bundled |

---
*Research completed: 2026-03-21*
