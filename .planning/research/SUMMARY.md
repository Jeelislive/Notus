# Project Research Summary

**Project:** Granola - AI Meeting Notes SaaS
**Domain:** AI audio transcription / meeting intelligence
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

This is a browser-based AI meeting notes product in the style of Granola.ai - recording system/mic audio without a bot joining the meeting, transcribing in real-time via STT, and using LLMs to structure notes and extract action items. The recommended approach is a tight Supabase-centric stack (Auth + Postgres + Storage + Realtime) paired with Next.js 15 App Router, Deepgram Nova-2 for live WebSocket transcription, and Vercel AI SDK v4 for LLM streaming. This consolidates what would otherwise be 4–5 separate vendor integrations into one platform and gives a production-ready foundation for v1.

The build order is strictly dependency-driven: Auth and DB schema must precede everything; the recording pipeline is the highest-complexity phase and must use chunked direct-to-storage uploads (never through a Route Handler) and async STT via Inngest background jobs. AI enhancement layers on top of transcription only after both are solid. Team features and billing come last because they can be added non-destructively.

The primary risks are in the audio capture layer - `getDisplayMedia` tab audio only works in Chrome/Edge, Vercel's 4.5MB function body limit kills long-meeting audio uploads unless you upload directly to storage, and STT costs can blow up without server-side usage caps. All three are preventable if addressed during Phase 3, but fatal if discovered in production. A secondary risk is the GDPR/consent issue, which must be addressed in Phase 1 onboarding before any recordings are taken.

---

## Key Findings

### Recommended Stack

The stack is anchored on **Supabase** as the unified backend - it handles Auth (Google OAuth + email/password), Postgres, file storage, and Realtime in one service, eliminating three separate vendor integrations. **Drizzle ORM** with TypeScript-native schema definition sits on top. **Deepgram Nova-2** is the only viable real-time STT option in 2025 (Whisper is batch-only). **Vercel AI SDK v4** is the standard LLM integration pattern for Next.js, using `streamText()` → `toDataStreamResponse()` → `useChat()`. **Inngest** handles background job processing for AI enhancement - its serverless-native, retryable job model is purpose-built for this workload.

The one hard platform constraint: Next.js 15 introduced async Request APIs (`cookies()`, `headers()`, `params` are all now async), which affects middleware and any SST streaming routes. This must be known before writing any server-side code.

**Core technologies:**
- **Next.js 15 (App Router) + TypeScript 5 + React 19:** SaaS framework foundation - React 19 concurrent features aid AI response streaming
- **Supabase:** Auth + Postgres + Storage + Realtime - eliminates 3 separate integrations
- **Drizzle ORM:** TypeScript-native ORM with Supabase; lighter and faster than Prisma
- **Deepgram Nova-2:** Real-time WebSocket STT - only option supporting live transcription
- **Vercel AI SDK v4:** Standard LLM integration for Next.js; handles streaming, hooks, and responses
- **Inngest:** Serverless-native background jobs - AI processing, exports, notifications
- **Stripe:** Subscriptions + Checkout + Customer Portal - industry standard
- **Tiptap:** ProseMirror-based rich text editor - required for programmatic AI content insertion
- **recordrtc:** MediaRecorder normalization across browsers - prevents codec failures
- **Resend + React Email:** Transactional email; minimal setup
- **Vercel:** Zero-config Next.js deployments

### Expected Features

See full analysis in `FEATURES.md`.

**Must have (table stakes) - Phase 1–2:**
- Browser audio capture (tab + mic) with real-time transcription
- Speaker diarization (who said what)
- Timestamped transcript display alongside notes
- In-meeting notepad + post-meeting AI note enhancement
- Auto-generated summary + action item extraction
- Email/Google OAuth auth
- Meeting dashboard (list, search, view)
- Full-text search across transcripts

**Should have (competitive) - Phase 3–4:**
- AI chat on transcript ("what was the budget discussed?")
- Meeting templates (customer discovery, 1-on-1, sales call, etc.)
- Shareable public link
- Slack + Notion export
- Calendar integration (auto-detect meeting title)
- Follow-up email generation

**Defer to v2+:**
- Team workspace / collaborative editing (requires CRDT/Yjs - architecturally complex)
- CRM integration (Salesforce, HubSpot)
- Semantic search (requires embeddings/vector DB)
- Meeting analytics / talk time
- Mobile app
- Recurring meeting memory

**Explicit anti-features (never build):**
- Meeting bots (core differentiator is no-bot)
- Video recording (storage cost, not core value)
- Self-hosted/on-premise

### Architecture Approach

The architecture is a browser-driven pipeline: Chrome captures tab/mic audio via `getDisplayMedia`/`getUserMedia`, streams chunks to Deepgram Nova-2 via WebSocket, persists transcript segments to Supabase Postgres in real-time, and pushes them to the UI via Supabase Realtime. The user edits notes in a Tiptap editor with 3-second auto-save. When recording stops, the meeting triggers an Inngest background job that fetches the full transcript, sends it to Claude/GPT-4o, and persists structured notes. AI chat is a separate streaming Route Handler using `streamText()`. All heavy processing is off the request thread.

**Major components:**
1. **Audio Capture Module (client):** `getDisplayMedia`/`getUserMedia` + `recordrtc` + Deepgram WebSocket - Chrome/Edge only for tab audio
2. **STT Pipeline:** Deepgram Nova-2 → `transcript_segments` table → Supabase Realtime → UI
3. **Note Editor (Tiptap):** Rich text, template rendering, AI content insertion, 3s auto-save
4. **AI Enhancement (Inngest + LLM):** Post-meeting structuring, summary, action items - always async
5. **AI Chat (Route Handler):** `streamText()` → SSE stream - never blocks on full response
6. **Integrations Layer:** Slack, Notion, Calendar - OAuth tokens stored in Supabase, triggered by Inngest
7. **Payments (Stripe):** Checkout Session → webhook → plan update in DB → Customer Portal

### Critical Pitfalls

1. **`getDisplayMedia` tab audio is Chrome/Edge only** - Safari produces silent recordings with no error. Detect browser on recording start; block Safari for tab audio; fall back to mic-only. Show explicit browser requirement banner. Must be in Phase 3.

2. **Never upload audio through a Next.js Route Handler** - Vercel's 4.5MB body limit breaks any meeting over ~5 minutes. Always upload directly to Supabase Storage using signed upload URLs, with audio chunked into ≤60-second segments. Must be in Phase 3.

3. **STT must be async - never synchronous** - A Route Handler that waits for transcription will timeout (10s on Hobby, 60s on Pro). Use Deepgram WebSocket streaming during recording for real-time; use Inngest for any post-processing batch work. Must be in Phase 3.

4. **Usage caps before launching free tier** - Deepgram costs ~$0.0043/minute. A free user recording 8h/day costs $2/day. Server-side minute caps per billing period must be enforced before any public launch. Must be in Phase 7.

5. **GDPR/consent for recording** - Recording other participants without consent is illegal in many jurisdictions. Consent disclaimer in onboarding + recording UI must exist before any recordings are taken. Must be in Phase 1.

---

## Implications for Roadmap

Based on research, the feature dependency graph and pitfall phase mapping strongly suggest an 8-phase structure:

### Phase 1: Auth + Foundation + Legal
**Rationale:** Everything else depends on auth. The consent/GDPR issue must be resolved before any recording can happen - it's a legal risk, not a UX preference. DB schema + FTS indexes must be set from the start; retrofitting is painful.
**Delivers:** Working auth (Google OAuth + email), Supabase schema with migrations, consent UI, email verification
**Addresses:** User management (table stakes), recording consent disclaimer (GDPR)
**Avoids:** Pitfall #10 (consent), Pitfall #12 (email verification before recording), Pitfall #19 (FTS index in schema from day 1)

### Phase 2: Dashboard + Meeting Management
**Rationale:** Users need a place to see and manage meetings before we build recording. Establishes the core navigation shell and data layer. Full-text search index should already be in schema.
**Delivers:** Meeting list/dashboard, create/view/delete meetings, transcript search UI
**Addresses:** Dashboard + meeting list (table stakes)
**Uses:** Supabase Postgres + Drizzle, Next.js App Router pages

### Phase 3: Recording Pipeline + STT
**Rationale:** The highest-complexity phase - and the core value prop. Every critical pitfall (browser compat, upload size, async STT, codec fragmentation, VAD, AudioContext) lives here. Must be built correctly the first time; the architecture is hard to retrofit.
**Delivers:** Tab + mic audio capture in Chrome/Edge, real-time Deepgram transcription, live transcript display, audio chunked direct-to-Supabase-Storage
**Addresses:** Audio capture, real-time transcription, speaker diarization, transcript display (all table stakes)
**Avoids:** Pitfall #1 (browser detection), #2 (chunked upload, no Route Handler), #3 (async WebSocket STT), #5 (VAD filter), #6 (codec negotiation), #9 (audio retention policy), #15 (AudioContext user gesture), #16 (AudioWorklet not ScriptProcessorNode)
**Research flag:** Needs `/gsd:research-phase` - Deepgram WebSocket + browser audio APIs are complex and have edge cases

### Phase 4: Note Editor + Templates
**Rationale:** After recording produces transcripts, users need to write and view notes. Tiptap is required (not optional) because AI content must be injected programmatically. Templates are low-complexity and high-value.
**Delivers:** Tiptap rich text editor, auto-save, transcript display alongside notes, 5 meeting templates (1-on-1, customer discovery, sales call, user interview, standup)
**Addresses:** Note editor, auto-save, templates (table stakes + differentiators)
**Uses:** Tiptap, Supabase Realtime (auto-save)

### Phase 5: AI Enhancement + Chat
**Rationale:** Layered on top of transcription. Inngest job pattern must be used - never synchronous. The post-meeting UX moment is the highest-stakes interaction; latency must be managed with progress feedback and async notifications.
**Delivers:** Post-meeting AI note structuring (summary, action items, follow-up), AI chat on transcript, optimistic UI with progress feedback, email notification when notes ready
**Addresses:** AI note enhancement, summary, action items, follow-up email generation, AI chat (table stakes + differentiators)
**Avoids:** Pitfall #8 (AI content injection UX), #13 (latency UX at post-meeting moment)
**Uses:** Inngest, Vercel AI SDK v4, Claude/GPT-4o

### Phase 6: Sharing + Integrations + Calendar
**Rationale:** Retention features. Sharing and export turn meetings into artifacts users share outside the product - viral loop. Calendar integration improves meeting naming/discovery. Submit Google Calendar OAuth verification early.
**Delivers:** Public shareable links, Slack export, Notion export, email export, calendar auto-detection (meeting titles)
**Addresses:** Sharing, export, integrations (table stakes + differentiators)
**Avoids:** Pitfall #14 (Google Calendar OAuth verification - submit early), #18 (integration token refresh)
**Research flag:** May need research on Notion/Slack OAuth and export API specifics

### Phase 7: Billing + Usage Metering
**Rationale:** Must be complete before any public/freemium launch. Usage caps prevent free-tier economics from being destroyed. Stripe webhook ordering pitfall must be followed precisely.
**Delivers:** Stripe Checkout, Customer Portal, subscription plan enforcement, server-side minute caps per plan, abuse detection (email verification, IP rate limiting)
**Addresses:** Payments, freemium tier gates (monetization)
**Avoids:** Pitfall #4 (STT cost explosion), #11 (Stripe webhook ordering), #12 (freemium abuse)

### Phase 8: Team Workspace
**Rationale:** Additive - can be built non-destructively on top of existing individual-user data model. The `teams` and `team_members` tables are already in schema from Phase 1. Collaborative real-time editing deferred to v2.
**Delivers:** Team creation, shared meeting library, member invites, team templates, admin dashboard
**Addresses:** Team workspace (differentiator)
**Defers:** Collaborative real-time editing (Yjs/CRDT - v2)

### Phase Ordering Rationale

- Auth → Dashboard → Recording is a strict dependency chain; nothing else works without it
- Recording (Phase 3) is isolated as its own phase because it has the most pitfalls and the most complex integration; it should not be mixed with note-taking or AI work
- AI Enhancement (Phase 5) comes after the note editor (Phase 4) so the merge UX can be designed correctly - AI injects into an existing Tiptap document
- Billing (Phase 7) deliberately comes after the core product loop (Phases 1–6) to avoid premature optimization, but must precede any public launch
- Teams (Phase 8) is last because the schema supports it from the start but the social/collaborative features are non-critical for launch

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Recording Pipeline):** Deepgram WebSocket streaming API, `getDisplayMedia` constraints per Chrome version, `AudioWorkletNode` implementation - documentation is scattered and has version-specific edge cases
- **Phase 6 (Integrations):** Notion API rate limits, Slack Block Kit for formatted note export, Google Calendar OAuth scope verification process - external APIs with quirks
- **Phase 7 (Billing):** Stripe subscription metering + usage-based billing if usage caps are implemented via Stripe Meters rather than in-DB counting

Phases with standard patterns (skip research-phase):
- **Phase 1 (Auth + Foundation):** Supabase Auth + `@supabase/ssr` is well-documented
- **Phase 2 (Dashboard):** Standard Next.js CRUD - no novel patterns
- **Phase 4 (Note Editor):** Tiptap docs are comprehensive; template system is straightforward JSON
- **Phase 5 (AI Enhancement):** Vercel AI SDK v4 streaming pattern is well-documented
- **Phase 8 (Teams):** Standard multi-tenant data model - schema already accounts for it

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every technology recommendation is backed by official docs and clear rationale; version constraints for Next.js 15 specifically noted |
| Features | HIGH | Competitor analysis is thorough (6 competitors), feature matrix is explicit, dependency graph resolves ordering |
| Architecture | HIGH | Data model is complete, data flow sequences are detailed, component boundaries are clear, anti-patterns are explicit |
| Pitfalls | HIGH | 20 pitfalls documented with specific root causes, prevention strategies, and phase assignments; browser API pitfalls verified via MDN |

**Overall confidence:** HIGH

### Gaps to Address

- **Speaker diarization accuracy with tab audio:** Deepgram diarization is designed for separate audio channels per speaker; tab audio mixes all participants. Research notes this produces approximate results - the UI must set expectations correctly. Validate during Phase 3.
- **Deepgram costs at scale:** ~$0.0043/min is documented but verify current pricing before finalizing free-tier minute limits in Phase 7.
- **Tiptap + AI merge UX:** The research recommends a "suggestions panel" pattern rather than direct injection while user types, but the exact UX pattern (accept/reject per block vs. full replace) should be prototyped during Phase 5, not spec'd in advance.
- **Google Calendar OAuth timeline:** The 4–6 week verification window means calendar integration work in Phase 6 must be started (OAuth app submitted) during Phase 3 or 4 to avoid blocking Phase 6 delivery.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs - `getDisplayMedia`, `getUserMedia`, `MediaRecorder`, `AudioWorkletNode`, browser compatibility tables
- Deepgram documentation - Nova-2 WebSocket streaming, speaker diarization, pricing
- Vercel AI SDK v4 docs - `streamText()`, `toDataStreamResponse()`, `useChat()`, `useCompletion()` patterns
- Next.js 15 official docs - App Router, async Request APIs, Route Handlers, middleware
- Supabase docs - `@supabase/ssr`, Auth, Realtime, Storage RLS, connection pooling
- Drizzle ORM docs - schema definition, `drizzle-kit` migrations
- Stripe docs - Checkout Sessions, Customer Portal, webhook event ordering

### Secondary (MEDIUM confidence)
- Competitor analysis (Otter.ai, Fireflies.ai, Fathom, tl;dv, Read.ai) - feature matrix via product research
- Inngest docs - serverless job patterns, retries, Vercel integration
- Tiptap docs - ProseMirror, Yjs integration for future collaboration

### Tertiary (LOW confidence - validate during execution)
- Deepgram current pricing - verify before finalizing free-tier limits
- Google Calendar OAuth verification timeline - 4–6 weeks is approximate; submit early regardless

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
