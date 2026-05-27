## [2026-05-26T15:16:56Z] - Source And Reminder Integration

### Goal

Connect the product flow to the source-ingestion and reminder boundaries without exposing implementation labels in the customer-facing app.

### Changes

- Wired source scanning to call the inbox source route when Gmail is connected.
- Added local source-bundle fallback so onboarding remains reliable without live credentials.
- Sent the imported relationship signal into `/api/gift-source` as part of the structured gift brief.
- Added approval-time reminder preview creation through `/api/openclaw/reminder` in preview mode.
- Updated browser smoke coverage to assert source import, structured gift-source input, approval, reminder preview, and the approved state.
- Added the missing Codex live-check script and fixed the Docker helper workflow so `.env.local` is loaded before Compose starts app containers.
- Added an OpenAI-native voice-call path: Twilio outbound call creation, TwiML webhook, status webhook, allowlist checks, execute gate, and live check script.

### Decisions

- The product UI treats Gmail as the user-facing source, while AgentMail remains an implementation detail in architecture and code walkthroughs.
- Reminder channel work is prepared after gift approval, not before. This keeps the user journey focused on the gift decision.
- OpenClaw is called in preview mode from the app flow. Real sends remain gated by explicit credentials, consent, and allowlists.

### Tradeoffs

- If the inbox route is uncredentialed or unavailable, Kinloop silently uses the committed source bundle for continuity.
- The approval UI does not display the OpenClaw preview payload. That proof belongs in tests and the technical walkthrough.
- Supabase live checks remain separate from the local product flow so the recording path is not blocked by credentials.

### Risks

- Live inbox credentials and allowlisted channel sends still need environment-level verification.
- The source import currently reads the latest normalized signal rather than continuously indexing a mailbox.
- The browser flow verifies the API handoffs with route mocks; live checks should be run separately before recording with real credentials.

### Verification

- `scripts/container-run.sh npm run check:ui-copy`
- `scripts/container-run.sh npm run test`
- `scripts/container-run.sh npm run check`
- `scripts/container-run.sh npm run check:browser`
- `scripts/container-run.sh npm run check:codex-live` passed with `codex_structured_transform`.
- `scripts/container-run.sh npm run check:agentmail-live` passed against `kinloop-agent@agentmail.to`.
- `scripts/container-run.sh npm run check:supabase-live` passed.
- `scripts/container-run.sh npm run check:openclaw-live` stopped because `OPENCLAW_MODE=cli` is not enabled.
- `scripts/container-run.sh npm run test` covers the Twilio request shape, target allowlist, TwiML media stream output, and preview behavior.

### Demo Impact

The app can now be shown as a clean consumer gift flow while the code walkthrough proves the real architecture: connected source ingestion, structured gift generation, approval persistence, and a bounded reminder-channel handoff.

### Customer-Facing Context

Kinloop separates user approval from side effects. Source reads are explicit, gift recommendations are structured before rendering, approvals are saved as product state, and channel delivery remains previewed or allowlisted instead of autonomous.

### Next Recommended Step

Run one real allowlisted OpenClaw CLI send to the configured Discord account/channel before recording, then keep day-to-day demos in preview mode for safety and repeatability.

## [2026-05-26T23:31:00Z] - Reminder Channel Simplification (Discord Only)

### Goal

Remove the Twilio/voice escalation branch and keep reminder delivery focused on OpenClaw message sends (Discord channel/account) with explicit allowlist controls.

### Changes

- Removed voice routes (`/api/voice/reminder-call`, `/api/voice/twiml`, `/api/voice/status`) and deleted `lib/voice/twilio.js`.
- Removed voice test and live-check surfaces (`tests/voice.test.mjs`, `scripts/check-voice-live.mjs`, `check:voice-live` script).
- Simplified OpenClaw reminder response shape to message-only in `app/api/openclaw/reminder/route.js`.
- Removed voice command construction and escalation path from OpenClaw adapter/payload utilities.
- Removed voice/Twilio env/config references from `.env.example`, `docker-compose.yml`, and active product/docs surfaces.
- Updated browser/OpenClaw tests to assert message-only reminder behavior.

### Decisions

- Keep one reminder channel boundary (OpenClaw messaging) rather than maintaining dual message + voice transports.
- Preserve explicit execution gates and allowlists for live sends.
- Keep historical journal mentions of voice exploration as build-history context only; active architecture is now Discord message reminders.

### Tradeoffs

- Lost the optional voice escalation demo path.
- Reduced channel flexibility in exchange for a cleaner product story and lower maintenance overhead.

### Risks

- If call-based reminders become a requirement later, they need a separate reviewed integration path.
- Historical docs can still mention voice in prior work entries; this is intentional historical context, not active behavior.

### Verification

- `scripts/container-run.sh npm run test` passed (`39/39`).
- Repository search confirms no active runtime references to `api/voice`, `lib/voice/twilio`, `check:voice-live`, `TWILIO_*`, or `VOICE_*`.

### Demo Impact

The demo narrative is tighter: approval leads to an OpenClaw reminder payload and optional allowlisted Discord send, with no parallel voice branch to explain.

### Customer-Facing Context

Narrowing external side effects to one channel boundary improves audit clarity, operator confidence, and trust framing while keeping explicit human approval central.

### Next Recommended Step

Standardize all outward-facing wording to "OpenClaw Discord reminder" so reviewers never infer an unsupported multi-channel reminder scope.
