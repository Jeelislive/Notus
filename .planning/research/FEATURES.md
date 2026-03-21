# Features Research: AI Meeting Notes SaaS

**Domain:** AI meeting notes / audio transcription SaaS
**Reference product:** Granola.ai
**Competitors studied:** Otter.ai, Fireflies.ai, Fathom, tl;dv, Read.ai, Notion AI

---

## Table Stakes Features
*(Must have or users leave)*

### Audio Recording & Transcription
- **System/mic audio capture** — Record meeting audio from browser or system (Complexity: High)
- **Real-time or post-meeting transcription** — Convert audio to text via STT (Complexity: Medium)
- **Speaker identification / diarization** — Label who said what (Complexity: High)
- **Transcript display** — Show timestamped transcript alongside notes (Complexity: Low)
- **Transcript search** — Full-text search across all transcripts (Complexity: Medium)

### Note-Taking
- **In-meeting notepad** — Users can type notes while meeting is recorded (Complexity: Low)
- **Post-meeting AI note enhancement** — AI structures/formats notes after meeting ends (Complexity: Medium)
- **Rich text editor** — Bold, bullets, headings in notes (Complexity: Medium)
- **Auto-generated summary** — AI summary of key points (Complexity: Low-Medium)
- **Action items extraction** — AI pulls out action items automatically (Complexity: Low-Medium)

### User & Account Management
- **Email/password auth** — Standard login (Complexity: Low)
- **Google OAuth** — One-click login (Complexity: Low)
- **User profile** — Name, avatar, timezone (Complexity: Low)
- **Dashboard / meeting list** — Browse past meetings (Complexity: Low)

### Sharing & Export
- **Shareable link** — Public or unlisted link to notes (Complexity: Low)
- **Copy to clipboard** — Copy formatted notes (Complexity: Low)
- **Email export** — Send notes via email (Complexity: Low)
- **PDF export** — Download notes as PDF (Complexity: Medium)

### Integrations
- **Slack integration** — Send notes to a Slack channel (Complexity: Medium)
- **Notion integration** — Push notes to Notion pages (Complexity: Medium)
- **Calendar integration** — Auto-detect meeting names from Google/Outlook calendar (Complexity: Medium)

---

## Differentiating Features
*(Competitive advantages — not all competitors have these)*

### AI Intelligence
- **AI chat on transcript** — Ask questions about meeting ("What was the budget discussed?") (Complexity: Medium)
- **Custom AI prompts** — User-defined questions auto-answered after every meeting (Complexity: Medium)
- **Meeting templates** — Pre-structured note formats per meeting type (Complexity: Low)
  - Customer discovery, 1-on-1, user interview, sales call, standup
- **Follow-up email generation** — AI drafts follow-up email from transcript (Complexity: Low)
- **Blog post / content generation** — Turn meeting into content (Complexity: Low)
- **Sentiment analysis** — Track engagement/sentiment across meetings (Complexity: High)

### Recording Approach
- **No-bot approach** — Records system audio silently, no bot joins (Complexity: High — Granola's key differentiator)
- **Phone call recording** — Record calls via mobile app (Complexity: High)
- **Automatic recording** — Detect and auto-start when a meeting begins (Complexity: High)

### Collaboration & Teams
- **Team workspace** — Shared meeting library for a team (Complexity: Medium)
- **Collaborative notes** — Multiple people edit notes simultaneously (Complexity: High)
- **Meeting permissions** — Control who can view/edit (Complexity: Medium)
- **Team templates** — Shared templates across team (Complexity: Low)
- **Admin dashboard** — Usage stats, member management (Complexity: Medium)

### Productivity
- **CRM integration** — Push notes to Salesforce, HubSpot (Complexity: High)
- **ATS integration** — Push interview notes to Greenhouse, Lever (Complexity: High)
- **Zapier/Make webhook** — Connect to any tool (Complexity: Medium)
- **Meeting analytics** — Talk time, meeting frequency, topics over time (Complexity: High)
- **Recurring meeting memory** — AI remembers context from prior meetings with same person (Complexity: High)

### Search & Discovery
- **Semantic search** — Search by meaning, not just keywords (Complexity: High)
- **Topic tagging** — Auto-tag meetings by topic (Complexity: Medium)
- **People tagging** — Track conversations by contact (Complexity: Medium)

---

## Anti-Features
*(Deliberately NOT building — at least in v1)*

| Feature | Why Not |
|---------|---------|
| Meeting bots (Zoom/Teams bots) | Core differentiator is no-bot; adds infra complexity |
| Video recording | Storage costs prohibitive, not core to value prop |
| Live transcription streaming to others | Complex WebSocket infra, edge case for v1 |
| Mobile app (iOS/Android) | Web-first; high cost, separate codebase |
| Self-hosted / on-premise | Enterprise complexity, not SaaS |
| Proprietary STT model | ML infra cost; use APIs |
| Whiteboard / screen recording | Scope creep |
| Built-in video conferencing | Not a meetings platform |

---

## Feature Dependency Graph

```
Auth
  └── Dashboard (meeting list)
        └── Recording (audio capture)
              └── Transcription (STT)
                    └── Note Editor
                          └── AI Enhancement (post-meeting)
                                └── AI Chat on transcript
                                └── Templates
                                └── Export (Slack, Notion, email)
                                └── Sharing (public link)
Calendar Integration (parallel, enhances meeting naming)
Team/Workspace (parallel, layered on top of individual)
Payments/Billing (parallel, enables freemium gates)
```

---

## Competitor Feature Matrix

| Feature | Granola | Otter.ai | Fireflies | Fathom | tl;dv | Read.ai |
|---------|---------|----------|-----------|--------|-------|---------|
| No-bot recording | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| AI note enhancement | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| AI chat on transcript | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Templates | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| CRM integration | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Team workspace | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mobile app | ✓ (iOS) | ✓ | ✓ | ✗ | ✗ | ✗ |
| Calendar sync | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Slack export | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notion export | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Freemium | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## MVP Prioritization (v1 Phase Groupings)

**Must ship in Phase 1-2 (Core loop):**
Auth → Dashboard → Recording → Transcription → Note editor → AI enhancement

**Must ship in Phase 3-4 (Retention drivers):**
Templates → AI chat → Sharing → Export (Slack, Notion, email) → Calendar integration

**Phase 5+ (Growth / Monetization):**
Team workspace → Payments/billing → CRM integrations → Admin dashboard → Analytics

---
*Research completed: 2026-03-21*
