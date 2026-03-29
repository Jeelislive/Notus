# Features Backlog

## Feature 1 - Intelligent AI Summary (Structured, Speaker-Aware)

### Overview
Replace generic AI summaries with structured, context-rich output that understands *who said what* and automatically highlights key moments.

### Sub-features

#### 1.1 Speaker Detection & Attribution
- Transcript segments already have `speaker` field - wire it into the AI prompt
- AI summary should attribute statements: *"Jeel said: 'We need to ship by Friday'"*
- Show speaker avatars/initials beside attributed quotes in the Summary tab
- Detect speaker roles: identify who is manager vs. direct report in a 1-on-1

#### 1.2 Key Moment Highlighting
Auto-detect and tag transcript moments by type:
| Moment Type | Color | Examples |
|---|---|---|
| Decision | 🟢 Green | "We decided to...", "Let's go with..." |
| Question | 🔵 Blue | "Can you clarify...", "What's the status of..." |
| Action Item | 🟠 Orange | "Jeel will...", "I'll send that by..." |
| Deadline | 🔴 Red | "by Friday", "end of quarter", "before launch" |
| Risk / Blocker | 🟡 Yellow | "blocked on...", "at risk", "concern is..." |
| Agreement | 🟣 Purple | "Everyone agreed", "We're aligned on..." |

- Highlight these in the Transcript panel with colored left-border or background tint
- Show a "Key Moments" timeline sidebar in the transcript (jump to moment)

#### 1.3 Structured AI Output Format
Replace free-text summary with structured sections:

```
📋 Meeting Overview
  Type: 1-on-1 | Duration: 32 min | Participants: Jeel, Manager

🎯 Decisions Made
  • [Decision] Decided to move API deadline to next sprint - Jeel, 12:04
  • [Decision] Will use Stripe for billing - Manager, 18:22

❓ Open Questions
  • Who owns the QA process after handoff? (unanswered)
  • Budget approval - waiting on Manager

⚡ Action Items
  → Jeel: Fix API bug  |  Due: Friday
  → Manager: Send contract  |  Due: EOD

⚠️ Risks & Blockers
  • API dependency on third-party - flagged by Jeel at 08:14
  • Timeline at risk if design not finalized by Wednesday

💬 Key Quotes
  "We can't ship without testing" - Jeel, 14:33
  "I'll escalate this to leadership" - Manager, 22:10
```

#### 1.4 Implementation Notes
- Update Groq prompt in `/api/ai/enhance` to request structured JSON output
- Parse JSON response and render each section as a dedicated card in AI Summary tab
- Store structured output in note's `summary` field as JSON
- Schema: add `summaryStructured: text` column to notes (JSON)
- Keep existing `summary` as plain-text fallback

---

## Feature 2 - Action Items Auto-Tracking + Jira Integration

### Overview
Automatically detect commitments in transcript/notes and convert them to trackable tasks. One-click Jira integration to assign and create tickets without leaving Notus.

### Sub-features

#### 2.1 Auto-Detection from Transcript
- Detect patterns: *"[Name] will [action] by [date]"*, *"I'll [action]"*, *"Let's make sure [name] handles..."*
- Extract: `assignee`, `action description`, `deadline`
- Show detected action items in a "Review" popup before confirming
- Examples:
  - *"Jeel will fix the API by Friday"* → Task: "Fix the API", Assignee: Jeel, Due: Friday
  - *"I'll send the contract by EOD"* → Task: "Send the contract", Assignee: Speaker, Due: EOD

#### 2.2 Action Item Review Popup
Popup appears after AI processing with detected action items:
```
┌─────────────────────────────────────────────────┐
│  ⚡ Action Items Detected (3)                    │
│─────────────────────────────────────────────────│
│  ☑ Fix API bug                                  │
│    👤 Jeel Mehta   📅 Friday, Mar 28            │
│    Priority: High                               │
│─────────────────────────────────────────────────│
│  ☑ Send contract draft                          │
│    👤 Manager      📅 Today, EOD               │
│    Priority: Medium                             │
│─────────────────────────────────────────────────│
│  ☐ Schedule follow-up call                      │
│    👤 Unassigned   📅 Next week                │
│─────────────────────────────────────────────────│
│  [Edit]  [Create in Notus]  [Push to Jira →]   │
└─────────────────────────────────────────────────┘
```

#### 2.3 Jira Integration
- **Setup**: Settings page → connect Jira (OAuth or API token + domain)
- **One-click "Push to Jira" flow**:
  1. Click "Push to Jira" in action items popup
  2. Popup shows: Task name, Assignee (mapped to Jira user), Due date, Priority, Project selector, Issue type
  3. User clicks **Apply** → creates Jira issue via Jira REST API
  4. Auto-assigns to correct team member
  5. Returns Jira issue link - show as badge on the action item
- **Jira issue fields**: Summary, Description (with meeting context), Assignee, Due date, Priority, Labels (meeting-id, notus-generated)
- **Schema**: add `jiraIntegration: jsonb` to profiles (stores domain, token, project defaults)
- **API route**: `POST /api/integrations/jira/create-issue`

---

## Feature 3 - Search Across All Meetings (AI-Powered)

### Overview
Google-like search bar that works across all meeting transcripts, notes, and summaries. Supports natural language queries powered by AI.

### Sub-features

#### 3.1 Basic Full-Text Search
- Search bar in dashboard header (or dedicated `/dashboard/search` page)
- Real-time search across: meeting titles, note content, transcript content, AI summaries
- Postgres full-text search (`to_tsvector` / `to_tsquery`) for speed
- Results show: meeting title, date, matched snippet with keyword highlighted
- Keyboard shortcut: `Cmd+K` or `Ctrl+K` to open

#### 3.2 AI-Powered Natural Language Search
- Queries like: *"show meetings where pricing was discussed"*
- Query: *"find when client rejected feature X"*
- Query: *"what did we decide about the API last month?"*
- Flow: Send query + meeting metadata to Groq → AI identifies relevant meetings → return ranked results
- Vector embeddings (optional upgrade): embed transcript chunks, use pgvector for semantic similarity

#### 3.3 Search Result UI
```
🔍 "pricing discussed"

Found 4 meetings

┌────────────────────────────────────────────────┐
│  📅 Mar 15 - Q2 Planning                       │
│  "...we agreed the pricing tier should start   │
│   at $49..." [jump to transcript →]            │
├────────────────────────────────────────────────┤
│  📅 Mar 10 - Client Call: Acme Corp            │
│  "...client pushed back on pricing, said it's  │
│   too high for SMBs..." [jump to transcript →] │
└────────────────────────────────────────────────┘
```

#### 3.4 Filters
- Filter by date range, meeting type, participant, tags
- Filter by moment type (Decisions, Action Items, Risks)

#### 3.5 Implementation Notes
- Add `search_vector` column to meetings + transcript_segments (tsvector)
- Trigger to auto-update on insert/update
- New API route: `GET /api/search?q=...`
- Optional: Groq call to rephrase natural language → SQL/keywords
- Schema: consider `pgvector` extension on Supabase for semantic search

---

## Feature 4 - Live Meeting Assistant

### Overview
Real-time AI co-pilot that activates during active recordings. Shows contextual suggestions, past meeting references, and contradiction detection - all in a live side panel.

### Sub-features

#### 4.1 Live Suggestions During Recording
- As speech is transcribed in real-time, AI analyses the last 30 seconds
- Shows suggestions in a live panel beside the transcript:
  - *"You discussed this with the same client on Mar 10 - they mentioned X"*
  - *"This contradicts the decision made on Feb 28"*
  - *"Consider asking: What's the timeline for this?"*
- Debounced - updates every 10-15 seconds to avoid noise

#### 4.2 Context from Past Meetings
- When a topic is detected (e.g., "pricing", "API"), automatically surface:
  - Related past meetings (title + date + snippet)
  - Previous decisions on that topic
  - Unresolved action items related to same topic
- Shown as collapsible cards in the live assistant panel

#### 4.3 Contradiction Detection
- Detects when current statement contradicts a past decision
- Example: *"Let's use PostgreSQL"* when past meeting had *"We decided on MongoDB"*
- Highlighted with a red/amber warning card: *"⚠️ Contradiction: On Mar 5 you decided to use MongoDB"*

#### 4.4 Color-Coded Highlighting System
Live transcript uses colored highlights:
| Color | Meaning |
|---|---|
| 🟢 Green border | Decision or agreement |
| 🔵 Blue border | Question (answered or open) |
| 🔴 Red border | Contradiction with past meeting |
| 🟠 Orange border | Action item / commitment |
| 🟡 Yellow border | Risk or blocker flagged |
| 🟣 Purple border | New insight / AI suggestion |

#### 4.5 Implementation Notes
- Live assistant panel: new column in `MeetingClient` layout (toggleable)
- Trigger: after each `liveSegments` update, debounce 10s, send last N segments + meeting context to Groq
- Groq prompt: classify segment type + check against past meeting summaries
- Past meeting context: fetch user's last 20 meeting summaries, send condensed version in prompt
- API route: `POST /api/ai/live-assist` (SSE or polling every 10s during recording)
- Contradiction store: embeddings of all past decisions (or keyword matching to start)
- UI: side panel with tabs - Suggestions / Past Context / Contradictions

---

## Priority Order (Suggested)

| # | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Structured AI Summary (1.1–1.3) | Medium | Very High |
| 2 | AI-Powered Search (3.1–3.3) | Medium | High |
| 3 | Action Item Detection + Review Popup (2.1–2.2) | Medium | High |
| 4 | Live Meeting Assistant (4.1–4.3) | High | Very High |
| 5 | Jira Integration (2.3) | High | Medium |
| 6 | Vector/Semantic Search (3.2 upgrade) | High | High |
