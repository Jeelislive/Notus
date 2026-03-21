# Requirements: Granola Clone — AI Meeting Notes SaaS

**Defined:** 2026-03-21
**Core Value:** Meeting notes that write themselves — users focus on the conversation, AI handles the rest.

---

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in with email and password and stay logged in across sessions
- [ ] **AUTH-03**: User can log in with Google OAuth (one-click)
- [ ] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: User can log out from any page
- [ ] **AUTH-06**: User receives email verification after signup (before recording is allowed)

### Recording

- [ ] **REC-01**: User can capture tab audio from active browser tab (Chrome/Edge only)
- [ ] **REC-02**: User can capture microphone audio as fallback on non-Chrome browsers
- [ ] **REC-03**: User can manually start a recording with a single click
- [ ] **REC-04**: User can manually stop a recording
- [ ] **REC-05**: App detects when a meeting tab is active and prompts user to start recording
- [ ] **REC-06**: User sees a clear browser compatibility warning if tab audio is unsupported
- [ ] **REC-07**: Audio is chunked and uploaded directly to storage (not through API route)

### Transcription

- [ ] **STT-01**: User sees real-time transcript appearing during recording
- [ ] **STT-02**: Transcript segments are timestamped (linked to time in meeting)
- [ ] **STT-03**: Speaker labels are shown on transcript segments (approximate diarization)
- [ ] **STT-04**: User can search across all meeting transcripts with full-text search
- [ ] **STT-05**: Transcript is stored and accessible after meeting ends

### Note Taking

- [ ] **NOTE-01**: User can type manual notes in a rich text editor during recording
- [ ] **NOTE-02**: Notes auto-save every few seconds during meeting
- [ ] **NOTE-03**: AI enhances and structures notes automatically after meeting ends
- [ ] **NOTE-04**: AI generates a summary of key discussion points post-meeting
- [ ] **NOTE-05**: AI extracts and lists action items from the transcript post-meeting
- [ ] **NOTE-06**: User can edit AI-generated notes after processing

### AI Features

- [ ] **AI-01**: User can ask natural language questions about a meeting transcript (AI chat)
- [ ] **AI-02**: AI chat streams responses in real-time (not waiting for full completion)
- [ ] **AI-03**: User can select a meeting template before or during a meeting
- [ ] **AI-04**: System provides built-in templates: Customer Discovery, 1-on-1, User Interview, Sales Call, Standup
- [ ] **AI-05**: User can create custom meeting templates
- [ ] **AI-06**: AI generates a follow-up email draft from the meeting transcript
- [ ] **AI-07**: User can define custom AI prompts that run automatically after every meeting
- [ ] **AI-08**: AI processing status is shown to user (progress indicator, not blank spinner)

### Sharing & Export

- [ ] **SHARE-01**: User can generate a public shareable link for a meeting's notes
- [ ] **SHARE-02**: Public share link shows read-only notes view (no auth required to view)
- [ ] **SHARE-03**: User can disable/revoke a share link
- [ ] **SHARE-04**: User can export notes to a Slack channel
- [ ] **SHARE-05**: User can export notes to a Notion page
- [ ] **SHARE-06**: User can send notes via email

### Calendar Integration

- [ ] **CAL-01**: User can connect their Google Calendar
- [ ] **CAL-02**: Upcoming meetings are shown in the dashboard from calendar
- [ ] **CAL-03**: Meeting title and participants are auto-populated from calendar event
- [ ] **CAL-04**: User can start recording directly from a calendar meeting entry

### Dashboard & Meeting Management

- [ ] **DASH-01**: User sees a list of all their past meetings in a dashboard
- [ ] **DASH-02**: User can search meetings by title or transcript content
- [ ] **DASH-03**: User can delete a meeting and its associated data
- [ ] **DASH-04**: User can rename a meeting
- [ ] **DASH-05**: Meeting list shows status (recording / processing / done) and duration

### Team Workspace

- [ ] **TEAM-01**: User can create a team workspace
- [ ] **TEAM-02**: User can invite members to a team via email
- [ ] **TEAM-03**: Team members can access shared meeting library
- [ ] **TEAM-04**: Team can have shared meeting templates available to all members
- [ ] **TEAM-05**: Meeting owner can set permissions (private / team-visible / public)
- [ ] **TEAM-06**: Team admin can view all team meetings and usage
- [ ] **TEAM-07**: Team admin can manage members (invite, remove, change role)

### Billing

- [ ] **BILL-01**: Free tier allows up to 300 recording minutes per month
- [ ] **BILL-02**: User cannot start recording if free tier limit is reached (clear error message)
- [ ] **BILL-03**: User can subscribe to a paid plan via Stripe Checkout
- [ ] **BILL-04**: Paid plan removes recording minute limits
- [ ] **BILL-05**: User can manage subscription (upgrade, downgrade, cancel) via Stripe Customer Portal
- [ ] **BILL-06**: App updates user plan immediately on Stripe webhook events

---

## v2 Requirements

### Advanced AI
- **AIV2-01**: Semantic search across meetings (search by meaning, not just keywords)
- **AIV2-02**: Topic tagging — auto-tag meetings by subject
- **AIV2-03**: People tagging — track conversations by contact across meetings
- **AIV2-04**: Recurring meeting memory — AI remembers context from prior meetings with same attendees

### Integrations
- **INTV2-01**: CRM integration — push notes to HubSpot or Salesforce
- **INTV2-02**: ATS integration — push interview notes to Greenhouse or Lever
- **INTV2-03**: Zapier/webhook support — connect to any tool

### Collaboration
- **COLLV2-01**: Real-time collaborative note editing (multiple users simultaneously)

### Mobile
- **MOBV2-01**: iOS app with meeting recording support
- **MOBV2-02**: Phone call recording via mobile app

### Analytics
- **ANAV2-01**: Meeting analytics — talk time, meeting frequency, topic trends

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Meeting bots (Zoom/Teams bots) | Core differentiator is no-bot; adds infra complexity |
| Video recording | Storage costs prohibitive; not core to value prop |
| Desktop app (Electron) | Web-first; mobile/desktop in future |
| Self-hosted / on-premise | Enterprise complexity not in v1 |
| Real-time collaborative editing | OT/CRDT complexity; defer to v2 |
| Magic link / passwordless login | Email + Google OAuth sufficient for v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 to AUTH-06 | Phase 1 | Pending |
| DASH-01 to DASH-05 | Phase 2 | Pending |
| REC-01 to REC-07 | Phase 3 | Pending |
| STT-01 to STT-05 | Phase 3 | Pending |
| NOTE-01 to NOTE-06 | Phase 4 | Pending |
| AI-03 to AI-05 | Phase 4 | Pending |
| AI-01, AI-02, AI-06 to AI-08 | Phase 5 | Pending |
| SHARE-01 to SHARE-06 | Phase 6 | Pending |
| CAL-01 to CAL-04 | Phase 6 | Pending |
| BILL-01 to BILL-06 | Phase 7 | Pending |
| TEAM-01 to TEAM-07 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*
