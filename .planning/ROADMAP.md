# Roadmap: Granola - AI Meeting Notes SaaS

**Milestone:** v1 - Core Product
**Goal:** Ship a browser-based AI meeting notes product with audio capture, real-time transcription, AI-enhanced notes, sharing, calendar integration, billing, and team workspaces.

---

## Phase 1: Auth + Foundation + Legal

**Goal:** Working authentication (Google OAuth + email/password), Supabase Postgres schema with migrations, GDPR consent UI, and email verification gate before recording is allowed.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Rationale:** Everything else depends on auth. The consent/GDPR issue must be resolved before any recording can happen - it's a legal risk. DB schema + FTS indexes must be set from the start; retrofitting is painful.

**Delivers:**
- Next.js 15 App Router project scaffold (TypeScript, Tailwind CSS 4, shadcn/ui)
- Supabase project connected with `@supabase/ssr` middleware
- Drizzle ORM schema: users, teams, team_members, meetings, transcript_segments, notes, templates, usage_tracking
- Full-text search indexes on transcript_segments and meetings
- Email/password signup + login with email verification
- Google OAuth one-click login
- Password reset via email (Resend)
- Recording consent disclaimer in onboarding flow
- Supabase Row Level Security policies for all tables

**Status:** Pending

---

## Phase 2: Dashboard + Meeting Management

**Goal:** Users have a functional dashboard to view, create, search, rename, and delete meetings before the recording feature is built.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05

**Rationale:** Users need a place to see and manage meetings before recording is built. Establishes core navigation shell and data layer.

**Delivers:**
- Meeting list dashboard with status badges (recording / processing / done) and duration
- Create new meeting (manual)
- View meeting detail page (transcript + notes layout)
- Rename and delete meetings
- Full-text search across meeting titles and transcript content
- Responsive layout with navigation shell

**Status:** Pending

---

## Phase 3: Recording Pipeline + STT

**Goal:** Users can record tab audio (Chrome/Edge) or microphone audio, with a real-time transcript appearing during the meeting. Audio chunked directly to Supabase Storage - never through a Route Handler.

**Requirements:** REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, STT-01, STT-02, STT-03, STT-04, STT-05

**Rationale:** The highest-complexity phase and the core value prop. Every critical pitfall (browser compat, upload size limit, async STT, codec fragmentation, AudioContext) lives here. Must be built correctly the first time.

**Delivers:**
- Chrome/Edge browser detection with explicit incompatibility warning for Safari/Firefox tab audio
- Tab audio capture via `getDisplayMedia` (Chrome/Edge) + mic fallback via `getUserMedia`
- `recordrtc` library for cross-browser MediaRecorder normalization
- Audio chunked into ≤60-second segments uploaded directly to Supabase Storage via signed upload URLs
- Deepgram Nova-2 WebSocket real-time transcription with speaker diarization
- Transcript segments stored in Postgres with timestamps
- Supabase Realtime subscription pushing transcript segments to UI
- Live transcript display panel during recording
- Recording start/stop controls with clear state indicators
- Inngest background job for post-recording audio cleanup and metadata update

**Status:** Pending

---

## Phase 4: Note Editor + Templates

**Goal:** Users can write rich text notes during a meeting, have them auto-saved, view the transcript alongside notes, and choose a meeting template before or during recording.

**Requirements:** NOTE-01, NOTE-02, NOTE-06, AI-03, AI-04, AI-05

**Rationale:** After recording produces transcripts, users need to write and view notes. Tiptap is required because AI content must be injected programmatically. Templates are low-complexity and high-value.

**Delivers:**
- Tiptap rich text editor (ProseMirror-based) for manual note-taking
- Auto-save every 3 seconds during meeting via Supabase
- Split-pane layout: transcript on left, notes on right
- Template selection UI (before/during meeting)
- 5 built-in templates: Customer Discovery, 1-on-1, Sales Call, User Interview, Daily Standup
- Custom template creation and storage per user
- Template renders as structured Tiptap document with AI-fillable sections

**Status:** Pending

---

## Phase 5: AI Enhancement + Chat

**Goal:** After a meeting ends, AI automatically structures notes, generates summary and action items, produces a follow-up email draft, and users can chat with the transcript.

**Requirements:** NOTE-03, NOTE-04, NOTE-05, AI-01, AI-02, AI-06, AI-07, AI-08

**Rationale:** Layered on top of transcription. Inngest job pattern used - never synchronous. Post-meeting UX moment is highest-stakes; latency managed with progress feedback and async notifications.

**Delivers:**
- Inngest background job triggered on recording stop: fetches transcript → sends to Claude via Vercel AI SDK v4 → persists structured notes
- AI note structuring (summary, key points, decisions, action items) injected into Tiptap document
- AI-generated action items list with assignees extracted from transcript
- Follow-up email draft generated post-meeting
- AI processing progress UI (not blank spinner - step-by-step status)
- Email notification (Resend) when AI notes are ready
- AI chat panel on meeting transcript: streaming responses via `streamText()` → SSE
- Custom AI prompts that run automatically after every meeting (user-defined)

**Status:** Pending

---

## Phase 6: Sharing + Integrations + Calendar

**Goal:** Users can share meeting notes publicly, export to Slack/Notion/email, and auto-detect meeting titles from Google Calendar.

**Requirements:** SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06, CAL-01, CAL-02, CAL-03, CAL-04

**Rationale:** Retention features. Sharing turns meetings into artifacts users share outside the product - viral loop. Calendar integration improves meeting naming/discovery. Google Calendar OAuth verification must be submitted early.

**Delivers:**
- Public shareable link generation per meeting (read-only, no auth required)
- Share link disable/revoke
- Slack export: OAuth connection, post notes to selected channel via Block Kit
- Notion export: OAuth connection, create Notion page with meeting notes
- Email export: send notes to specified email via Resend
- Google Calendar OAuth connection
- Upcoming meetings list in dashboard from connected calendar
- Meeting title + participants auto-populated from calendar event
- Start recording directly from calendar meeting entry

**Status:** Pending

---

## Phase 7: Billing + Usage Metering

**Goal:** Freemium model enforced - free tier capped at 300 min/month, paid tier via Stripe Checkout. Usage caps server-enforced before any public launch.

**Requirements:** BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06

**Rationale:** Must be complete before any public/freemium launch. Usage caps prevent free-tier economics destruction. Stripe webhook ordering pitfall must be followed precisely.

**Delivers:**
- Usage tracking per user per billing period (recording minutes in Postgres)
- Server-side cap enforcement: block recording start if free tier limit exceeded
- Clear UI error when limit reached with upgrade prompt
- Stripe Checkout for paid plan subscription
- Stripe Customer Portal for self-serve plan management (upgrade, downgrade, cancel)
- Stripe webhook handler: subscription.created, subscription.updated, subscription.deleted → update user plan in DB
- Email (IP + email verification) abuse detection for free tier
- Billing page showing current usage, plan, and upgrade options

**Status:** Pending

---

## Phase 8: Team Workspace

**Goal:** Users can create team workspaces, invite members, access a shared meeting library, and manage team templates and permissions.

**Requirements:** TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06, TEAM-07

**Rationale:** Additive - built non-destructively on top of existing individual-user data model. Teams and team_members tables already in schema from Phase 1.

**Delivers:**
- Team workspace creation
- Member invite via email (Resend)
- Shared meeting library (team-visible meetings)
- Team shared templates available to all members
- Meeting permission controls: private / team-visible / public-link
- Team admin dashboard: view all team meetings and usage
- Team admin member management: invite, remove, change role (admin / member)

**Status:** Pending

---

## Summary

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 1 | Auth + Foundation + Legal | AUTH-01–06 | Pending |
| 2 | Dashboard + Meeting Management | DASH-01–05 | Pending |
| 3 | Recording Pipeline + STT | REC-01–07, STT-01–05 | Pending |
| 4 | Note Editor + Templates | NOTE-01–02, NOTE-06, AI-03–05 | Pending |
| 5 | AI Enhancement + Chat | NOTE-03–05, AI-01–02, AI-06–08 | Pending |
| 6 | Sharing + Integrations + Calendar | SHARE-01–06, CAL-01–04 | Pending |
| 7 | Billing + Usage Metering | BILL-01–06 | Pending |
| 8 | Team Workspace | TEAM-01–07 | Pending |

---
*Created: 2026-03-21*
*Last updated: 2026-03-21*
