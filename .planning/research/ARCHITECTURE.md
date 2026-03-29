# Architecture Research: AI Meeting Notes SaaS

**Domain:** AI meeting notes / audio transcription SaaS
**Stack:** Next.js 15 + TypeScript + Supabase + Deepgram + Vercel AI SDK
**Date:** 2026-03-21

---

## System Overview

```
Browser (Chrome/Edge)
  │
  ├── Tab/Mic Audio Capture (getDisplayMedia / getUserMedia)
  │     └── recordrtc → chunked audio blobs
  │           └── WebSocket → Deepgram Nova-2 (STT)
  │                 └── Transcript segments (SSE/Realtime → UI)
  │
  ├── Note Editor (rich text, Tiptap)
  │     └── Auto-save → Supabase Postgres
  │
  └── Post-Meeting Trigger
        └── Inngest Job: AI Enhancement
              ├── Claude/GPT-4o → structured notes
              ├── Action items extraction
              └── AI chat index built
```

---

## Component Boundaries

### 1. Frontend - Next.js App Router
- **Communicates with:** Supabase (auth + DB + realtime), internal API routes
- **Responsibilities:** Recording UI, note editor, dashboard, sharing pages, settings, billing
- **Key pages:** `/dashboard`, `/meeting/[id]`, `/meeting/[id]/record`, `/share/[token]`

### 2. Audio Capture Module (client-side)
- **Communicates with:** Browser MediaDevices API, Deepgram WebSocket
- **Responsibilities:** Request permissions, capture tab/mic audio, chunk into segments, stream to STT
- **Key constraint:** Chrome/Edge only for tab audio

### 3. STT Pipeline - Deepgram
- **Communicates with:** Audio capture module (WebSocket in), Supabase (transcript storage out)
- **Responsibilities:** Real-time transcription, speaker diarization, confidence scores
- **Output:** `transcript_segments` rows in Postgres

### 4. Note Editor (Tiptap)
- **Communicates with:** Supabase Realtime (collaborative), auto-save API route
- **Responsibilities:** Rich text editing, template rendering, AI-generated content insertion
- **Key choice:** Tiptap (ProseMirror-based) - best for programmatic content insertion

### 5. AI Enhancement Pipeline - Inngest + LLM
- **Communicates with:** Supabase (transcript in, structured notes out), Claude/OpenAI API
- **Responsibilities:** Post-meeting note structuring, summary, action items, follow-up generation
- **Trigger:** Meeting ends → webhook → Inngest job queued

### 6. AI Chat - Route Handler + Vercel AI SDK
- **Communicates with:** Supabase (transcript fetch), LLM (streaming), browser (SSE)
- **Responsibilities:** Answer natural-language questions about a meeting transcript
- **Pattern:** `streamText()` → `toDataStreamResponse()` → `useChat()` on client

### 7. API Routes - Next.js Route Handlers
- **Communicates with:** Supabase, Deepgram, Stripe, Inngest, external integrations
- **Key routes:**
  - `POST /api/meetings` - create meeting
  - `POST /api/meetings/[id]/start` - begin recording session
  - `POST /api/meetings/[id]/end` - trigger AI processing
  - `POST /api/ai/chat` - AI chat stream
  - `POST /api/webhooks/stripe` - billing events
  - `GET /api/share/[token]` - public share

### 8. Background Jobs - Inngest
- **Communicates with:** Supabase, LLM APIs, Resend, integration webhooks
- **Jobs:** AI note enhancement, export to Slack/Notion, email delivery, integration sync

### 9. Integrations Layer
- **Communicates with:** Slack API, Notion API, Google Calendar API, CRM APIs
- **Pattern:** OAuth flow per integration, stored tokens in Supabase, triggered by Inngest

### 10. Payments - Stripe
- **Communicates with:** Stripe API, Supabase (subscription status), Inngest (webhook handler)
- **Pattern:** Checkout Session → webhook → update user plan in DB → Customer Portal for self-service

### 11. Storage - Supabase Storage
- **Communicates with:** Audio capture (upload), AI pipeline (download for processing)
- **Buckets:** `audio` (private, user-scoped RLS), `exports` (temp)

---

## Data Model

```sql
-- Core entities
users           id, email, name, avatar_url, plan, stripe_customer_id, created_at
teams           id, name, slug, owner_id, plan, created_at
team_members    id, team_id, user_id, role (owner/admin/member)

-- Meetings
meetings        id, user_id, team_id, title, status (idle/recording/processing/done),
                started_at, ended_at, duration_seconds, calendar_event_id,
                template_id, share_token, share_enabled, created_at

-- Audio & Transcription
audio_chunks    id, meeting_id, chunk_index, storage_path, duration_ms, created_at
transcript_segments  id, meeting_id, speaker_label, text, start_ms, end_ms,
                     confidence, created_at

-- Notes & AI
notes           id, meeting_id, content (JSON/Tiptap), updated_at
ai_outputs      id, meeting_id, type (summary/action_items/follow_up/chat),
                prompt, content, model, created_at

-- Templates
templates       id, user_id, team_id, name, structure (JSON), is_system, created_at

-- Integrations
integrations    id, user_id, team_id, provider (slack/notion/hubspot),
                access_token, refresh_token, metadata (JSON), created_at
exports         id, meeting_id, provider, status, external_id, created_at
```

---

## Data Flow Sequences

### 1. Live Recording Flow
```
User clicks "Record"
  → Browser requests tab/mic permission
  → recordrtc starts capturing audio
  → Audio chunks streamed to Deepgram WebSocket
  → Deepgram returns transcript segments
  → Segments saved to Postgres (transcript_segments)
  → Supabase Realtime pushes to UI in real-time
  → User takes manual notes in Tiptap editor
  → Notes auto-saved every 3 seconds
User clicks "Stop"
  → recording ends, audio chunks saved to Supabase Storage
  → meeting.status → 'processing'
  → Inngest job triggered
```

### 2. AI Enhancement Flow (post-meeting)
```
Inngest receives meeting_id
  → Fetch full transcript from Postgres
  → Send to Claude/GPT-4o with template context
  → Stream structured notes back
  → Save to ai_outputs table
  → Merge with user's manual notes (ai-enhanced layer)
  → meeting.status → 'done'
  → Notify user (in-app + email)
```

### 3. AI Chat Flow
```
User types question in chat
  → POST /api/ai/chat { meeting_id, message }
  → Fetch transcript from Postgres
  → Build context prompt (transcript + prior chat history)
  → streamText() to Claude/GPT-4o
  → Stream response via SSE to client
  → Save exchange to ai_outputs
```

### 4. Share Flow
```
User clicks "Share"
  → Generate share_token (nanoid)
  → Set share_enabled = true on meeting
  → Public URL: /share/[token]
  → GET /api/share/[token] → fetch notes (no auth required)
  → Render read-only note view
```

---

## API Route Structure (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (app)/
│   ├── dashboard/page.tsx
│   ├── meeting/
│   │   └── [id]/
│   │       ├── page.tsx           -- view meeting notes
│   │       └── record/page.tsx    -- active recording UI
│   ├── settings/
│   │   ├── page.tsx               -- profile, account
│   │   ├── billing/page.tsx       -- Stripe Customer Portal
│   │   └── integrations/page.tsx  -- Slack, Notion, CRM
│   └── team/[slug]/page.tsx
├── share/[token]/page.tsx         -- public, no auth
└── api/
    ├── meetings/
    │   ├── route.ts               -- GET list, POST create
    │   └── [id]/
    │       ├── route.ts           -- GET, PATCH, DELETE
    │       ├── start/route.ts     -- POST: begin recording
    │       └── end/route.ts       -- POST: trigger processing
    ├── ai/
    │   └── chat/route.ts          -- POST: streaming chat
    ├── integrations/
    │   ├── slack/route.ts
    │   └── notion/route.ts
    └── webhooks/
        └── stripe/route.ts
```

---

## Suggested Build Order

1. **Auth + DB schema** - Supabase auth, Drizzle schema, migrations
2. **Dashboard + meeting CRUD** - List, create, view meetings
3. **Audio capture + STT** - Browser recording, Deepgram integration
4. **Note editor** - Tiptap editor, auto-save, transcript display
5. **AI enhancement** - Inngest jobs, LLM post-processing
6. **AI chat** - Streaming chat on transcript
7. **Templates + sharing** - Meeting templates, public share links
8. **Integrations + billing** - Slack/Notion exports, Stripe subscriptions

---

## Patterns to Follow

- Use Supabase RLS for all data access (never trust client-side user_id)
- Stream AI responses via Vercel AI SDK - never wait for full completion
- Queue heavy work (AI processing, exports) via Inngest - never block request
- Store audio in Supabase Storage with signed URLs - never expose direct paths
- Use Drizzle transactions for multi-table writes (meeting + notes + audio)

## Anti-Patterns to Avoid

- Don't process AI in the API route directly - always queue via Inngest
- Don't store API keys in client-side code or localStorage
- Don't load full transcript in AI chat context without chunking/RAG for long meetings
- Don't trust browser to enforce plan limits - always check server-side
- Don't use `useEffect` for real-time - use Supabase Realtime subscription hooks

---

## Scalability Notes

| Scale | Concern | Solution |
|-------|---------|---------|
| 100 users | Cold starts | Vercel free tier fine |
| 1K users | Audio storage | Supabase Storage + lifecycle policy |
| 10K users | STT costs | Deepgram cost ~$0.0043/min - budget for it |
| 100K users | DB connections | Supabase connection pooling (PgBouncer) |
| 1M users | AI costs | Haiku for summaries, Sonnet only for chat |

---
*Research completed: 2026-03-21*
