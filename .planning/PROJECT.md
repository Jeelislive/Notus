# Granola Clone - AI Meeting Notes SaaS

## What This Is

A web-based AI-powered meeting notepad that records meeting audio directly from the user's computer (no bot required), transcribes it in real-time, and uses AI to enhance and structure notes after the meeting ends. Targeted at anyone who has back-to-back meetings - PMs, VCs, sales, recruiters, consultants - and needs reliable, searchable, shareable meeting records without manual effort.

## Core Value

Meeting notes that write themselves - users focus on the conversation, the AI handles the rest.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Record meeting audio from the computer system (no bot joins the call)
- [ ] Generate real-time or post-meeting transcripts from audio
- [ ] Users can take manual notes in a notepad during meetings
- [ ] AI enhances and structures notes after meeting ends
- [ ] AI chat interface to query transcripts (extract action items, budgets, objections, etc.)
- [ ] Customizable templates for meeting types (customer discovery, 1-on-1s, interviews, etc.)
- [ ] Export notes to Slack, email, Notion, CRM, and ATS platforms
- [ ] Public shareable links for notes
- [ ] User authentication and account management
- [ ] Freemium model - free tier with limits, paid subscription for power usage
- [ ] Calendar integration to auto-detect and name meetings

### Out of Scope

- Mobile/iOS app - web-first, mobile in v2+
- Video recording - audio only for v1
- Meeting bots (Zoom bots, Teams bots) - differentiator is no-bot approach

## Context

- Granola.ai is the reference product: Mac desktop app, uses system audio capture, no meeting bots
- We are building the web equivalent - browser-based with screen/tab audio capture via Web Audio API or similar
- Enterprise customers of Granola include PostHog, Intercom, Ramp, Linear, Brex - validates strong B2B demand
- Audio transcription will rely on third-party STT (Whisper API / Deepgram / AssemblyAI)
- AI enhancement will use LLM APIs (Claude or OpenAI)
- Auth: email/password + Google OAuth

## Constraints

- **Tech Stack**: Next.js 15 + TypeScript - user preference
- **Platform**: Web-first (browser) - no desktop app for v1
- **Audio**: Browser Web Audio API for tab/mic capture; will need HTTPS and user permission
- **AI**: External APIs for STT and LLM (not self-hosted models for v1)
- **Deployment**: Vercel (natural fit for Next.js)
- **Database**: Postgres via Supabase or Neon (TBD by research)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over desktop | Lower friction, faster iteration, all-OS support | - Pending |
| No meeting bots | Core differentiator matching Granola - cleaner UX | - Pending |
| Freemium + subscription | Match market expectation, proven model for this category | - Pending |
| Next.js + TypeScript | User preference, well-suited for SaaS | - Pending |
| External STT API | Avoid ML infra complexity in v1 | - Pending |

---
*Last updated: 2026-03-21 after initialization*
