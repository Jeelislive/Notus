# Pitfalls Research: AI Meeting Notes SaaS

**Domain:** AI meeting notes / audio transcription SaaS
**Date:** 2026-03-21

---

## Critical Pitfalls

### 1. `getDisplayMedia` Cross-Browser Audio Failure
**What goes wrong:** Tab audio capture (`getDisplayMedia` with `audio: true`) only works in Chrome and Edge. Safari doesn't support it at all. Firefox requires video alongside audio. Users on Safari silently get no audio — recording appears to work but produces empty transcripts.

**Why it happens:** The Web Audio API spec for tab audio capture is not uniformly implemented.

**Consequences:** Silent recordings, user data loss, negative first impressions, support tickets.

**Prevention:**
- Detect browser on recording start — block/warn Safari users for tab audio
- Fall back to mic-only (`getUserMedia`) on unsupported browsers
- Display clear browser requirement banner ("Chrome or Edge required for tab audio")
- Phase 1: Browser detection + graceful degradation

**Warning signs:** Zero transcript segments after a meeting, user complaints of "it didn't record."

---

### 2. Vercel Function Body Size Limit (4.5MB)
**What goes wrong:** Vercel serverless functions have a 4.5MB request body limit. Audio at typical quality (webm/opus ~30KB/min) hits this limit around 5 minutes. Any meeting longer than that fails silently or throws a 413 error when uploading audio.

**Why it happens:** Vercel's edge/serverless architecture limits payload size.

**Consequences:** All long meetings fail to upload audio — the core feature breaks.

**Prevention:**
- Never upload audio through a Next.js API route — upload directly to Supabase Storage from the browser using signed upload URLs
- Chunk audio into ≤60-second segments and upload each chunk independently
- Phase 3 (audio pipeline): implement chunked direct-to-storage upload pattern

**Warning signs:** 413 errors in Vercel logs for meetings >5 min.

---

### 3. STT as Synchronous Request → Timeout
**What goes wrong:** Treating transcription as a synchronous API call in a Route Handler will timeout on Vercel (max 60s on Pro, 10s on Hobby). Long meetings never complete transcription.

**Why it happens:** STT processing takes longer than serverless function timeouts.

**Consequences:** Transcription silently fails for any real-world meeting.

**Prevention:**
- Use Deepgram WebSocket streaming during recording (real-time, not batch)
- For any post-processing, use Inngest background jobs — never Route Handler timeouts
- Phase 3: all STT processing must be async

---

### 4. STT Cost Explosion on Free Tier
**What goes wrong:** Deepgram charges ~$0.0043/minute. A free user recording 8 hours/day costs ~$2/day. Without caps, heavy users destroy the unit economics.

**Why it happens:** No per-user minute limits enforced server-side.

**Consequences:** Unsustainable LTV/CAC, free tier becomes loss-making.

**Prevention:**
- Enforce per-plan minute limits server-side (never client-side)
- Track `minutes_used` per billing period in DB
- Gate recording start if limit reached
- Free tier: 300 min/month; Pro: unlimited
- Phase 7 (billing): implement usage metering before launching free tier

**Warning signs:** STT costs growing faster than revenue.

---

### 5. STT Hallucinations on Silent/Low-Energy Audio
**What goes wrong:** Deepgram and Whisper hallucinate text when audio is near-silent (screen share with no speech, muted participants). The transcript fills with garbage tokens.

**Why it happens:** STT models are trained to always produce output.

**Consequences:** Garbled transcripts, AI enhancement produces nonsense, user trust damaged.

**Prevention:**
- Implement audio energy detection before sending to STT (Voice Activity Detection)
- Filter out segments below energy threshold
- Display "silence detected" rather than hallucinated text
- Phase 3: VAD filter on audio pipeline

---

### 6. MediaRecorder Codec Fragmentation
**What goes wrong:** Chrome produces `webm/opus`, Safari produces `mp4/aac`, Firefox produces `ogg/opus`. If you specify a codec that the browser doesn't support, `MediaRecorder` throws and recording doesn't start.

**Why it happens:** Browser inconsistency in MediaRecorder codec support.

**Consequences:** Recording fails on some browsers silently.

**Prevention:**
- Use `MediaRecorder.isTypeSupported()` to detect available codecs
- Use `recordrtc` library which handles this normalization
- Store codec metadata with each audio chunk for STT preprocessing
- Phase 3: codec negotiation layer

---

## Moderate Pitfalls

### 7. Building Real-Time Collaboration Too Early
**What goes wrong:** Collaborative note editing (multiple users editing simultaneously) is architecturally complex — requires OT or CRDT (Yjs), WebSocket server, conflict resolution. Building it early slows down the entire project.

**Prevention:** Ship single-user note editing first. Add collaboration in v2. Tiptap has Yjs integration when ready.

**Phase:** Defer to v2.

---

### 8. AI Content Injection Corrupting Note Editor State
**What goes wrong:** After AI enhancement, injecting AI-structured content into a Tiptap editor while the user is still editing corrupts the ProseMirror document state and breaks the undo history.

**Prevention:**
- Never mutate editor content while user is typing
- Show AI content in a separate "AI suggestions" panel — user explicitly accepts/merges
- Or replace content only on explicit user action ("Apply AI notes")
- Phase 5 (AI enhancement): design merge UX carefully

---

### 9. Audio Storage Cost Without Retention Policy
**What goes wrong:** Storing all raw audio files indefinitely. At 30KB/min, a user with 100 hours/month generates ~180MB/month. At scale, storage costs compound.

**Prevention:**
- Delete raw audio chunks after transcript is confirmed complete
- Keep transcripts (text) — storage is negligible
- Offer audio retention as a paid feature only
- Phase 3: auto-delete audio after processing

---

### 10. GDPR / Multi-Party Consent for Recording
**What goes wrong:** Recording other participants' voices without their consent is illegal in many jurisdictions (GDPR, CCPA, wiretapping laws). Users may not inform their meeting participants they are being recorded.

**Prevention:**
- Add consent disclaimer in onboarding and recording UI
- Provide a "meeting notice" template users can share with participants
- Add privacy policy section on recording consent
- This is a legal risk, not just UX — address in Phase 1 onboarding
- Phase 1: consent UI + terms of service

---

### 11. Stripe Webhook Ordering and Subscription State
**What goes wrong:** Stripe webhooks arrive out of order. `customer.subscription.updated` can arrive before `checkout.session.completed`. If you update subscription state naively, users get incorrect plan access.

**Prevention:**
- Use Stripe's event timestamp to order updates — only apply if event is newer than DB state
- Handle all relevant events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Use idempotency keys on all Stripe API calls
- Phase 7 (billing): follow Stripe's recommended webhook handling pattern

---

### 12. Freemium Multi-Account Abuse
**What goes wrong:** Power users create multiple free accounts to avoid paying. Each account burns STT minutes and storage.

**Prevention:**
- Rate limit by IP on signup
- Require email verification before allowing recording
- Flag suspicious patterns (same device, similar emails)
- Phase 7: abuse detection

---

### 13. AI Processing Latency UX at Post-Meeting Moment
**What goes wrong:** Meeting ends → user expects notes immediately → AI processing takes 30-60 seconds → user sees spinner → frustration. This is the worst moment for a bad UX because the user is about to go to their next meeting.

**Prevention:**
- Show progress: "Processing transcript... Generating notes... Done"
- Use optimistic UI — show transcript immediately, notes "coming soon"
- Send email/notification when notes are ready (user can leave)
- Phase 5 (AI): progress streaming + notification on completion

---

### 14. Google Calendar OAuth Scope Verification Delay
**What goes wrong:** Google requires verification for apps requesting sensitive Calendar scopes. The verification process takes 4-6 weeks. Launching with calendar integration requiring verification blocks the feature.

**Prevention:**
- Request only read-only calendar scope (`calendar.readonly`) — less sensitive
- Display "unverified app" warning to users in dev — expected in testing
- Submit for verification early (Phase 4 when calendar integration is built)
- Consider using calendar data only from email (parse meeting invites) as a fallback

---

### 15. AudioContext Autoplay Policy Blocking Recording
**What goes wrong:** Browsers block `AudioContext.resume()` until a user gesture. If recording tries to start programmatically (e.g., auto-start on calendar event), the AudioContext stays suspended and recording doesn't begin. No error is thrown.

**Prevention:**
- Always initiate recording from a direct user click handler
- Check `audioContext.state === 'running'` before processing
- Display "Click to start recording" prompt rather than auto-starting

---

## Minor Pitfalls

### 16. ScriptProcessorNode Deprecation (Main Thread Jank)
**What goes wrong:** `ScriptProcessorNode` is deprecated and runs on the main thread — causes audio dropouts and UI freezing.

**Prevention:** Use `AudioWorkletNode` for all audio processing. Phase 3.

---

### 17. Speaker Diarization Mismatch with Tab Audio
**What goes wrong:** Deepgram's speaker diarization expects distinct audio channels per speaker. Tab audio mixes all participants into one stream — diarization is less accurate than expected.

**Prevention:** Set accurate expectations in UI ("approximate speaker labels"). Don't promise perfect attribution. Phase 3: document limitation.

---

### 18. OAuth Token Expiry on Integrations
**What goes wrong:** Slack/Notion/HubSpot access tokens expire. Background jobs trying to export notes fail silently weeks after the user connected the integration.

**Prevention:**
- Implement token refresh logic for each integration
- Surface integration errors to users ("Notion disconnected — reconnect")
- Store token expiry timestamp and proactively refresh
- Phase 6 (integrations)

---

### 19. Transcript Full-Text Search Indexing
**What goes wrong:** `ILIKE` on 100K transcript rows is slow. Users expect instant search across all their meetings.

**Prevention:**
- Add `tsvector` column on `transcript_segments` with GIN index from day 1
- Use Postgres full-text search (`to_tsvector` + `to_tsquery`)
- Phase 2: schema includes FTS index from the start

---

### 20. Vercel Blob / Supabase Storage Cache Costs
**What goes wrong:** Audio files accessed repeatedly (during processing, re-processing) rack up egress costs unexpectedly.

**Prevention:**
- Process audio once, delete raw files after transcript confirmed
- Cache transcript text (tiny) not audio (large)
- Set storage lifecycle policies early

---

## Phase Mapping Summary

| Phase | Pitfalls to Address |
|-------|---------------------|
| Phase 1 (Auth + Foundation) | #10 (consent), #12 (email verification) |
| Phase 2 (Dashboard) | #19 (FTS index in schema) |
| Phase 3 (Recording + STT) | #1 (browser compat), #2 (chunked upload), #3 (async STT), #5 (VAD), #6 (codecs), #9 (audio retention), #15 (AudioContext), #16 (AudioWorklet), #17 (diarization) |
| Phase 4 (Calendar) | #14 (OAuth verification) |
| Phase 5 (AI Enhancement) | #8 (editor injection), #13 (latency UX) |
| Phase 6 (Integrations) | #18 (token refresh) |
| Phase 7 (Billing) | #4 (usage caps), #11 (webhook ordering), #12 (abuse) |

---
*Research completed: 2026-03-21*
