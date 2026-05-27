## 2026-05-27T10:21:00Z - Cross-Person Signals And Fallback Removal

### Goal

Stop gift recommendations from inheriting another recipient's imported signal context, and remove silent local fallbacks that masked auth or gift-matching failures during the demo path.

### Changes

- Landed commit `94de576` with API and UI hardening:
  - Added `signalMatchesPerson` guard in `normalizeGiftSourceRequest()` so extracted interests, avoid lists, source text, and gift leads apply only when `sourceSignal.signal.personId` matches the requested recipient
  - Removed `continueOnDevice()` sign-in bypass from the product UI
  - Removed `fallbackIdeasForPerson()` silent recovery when `/api/gift-source` fails; the UI now surfaces an explicit error
  - Stopped passing unrelated `sourceImport` blobs into client-side idea normalization
  - Moved reminder channel readiness checks to the dashboard view and kept approval focused on the gift decision
- Updated docs (`README.md`, `docs/architecture.md`, `docs/ui-architecture.md`) to describe the stricter auth and matching behavior.
- Expanded tests:
  - `tests/codex-gift-source.test.mjs` — imported signal ignored when it belongs to another person
  - `tests/browser/core-flow.spec.mjs` — aligned with the no-fallback product path
  - `tests/product-source.test.mjs` — product matching assertions updated

### Decisions

- Demo truthfulness beats silent resilience: if gift matching fails, say so instead of showing canned alternatives.
- Supabase sign-in is the real auth path when configured; the product no longer advertises a casual "continue on this device" bypass.
- Recipient-specific clues in the API brief are the canonical input to Codex curation, not whatever happens to be in the latest imported bundle.

### Tradeoffs

- Local development without Supabase credentials requires demo env setup instead of a one-click bypass.
- Failed live Codex calls produce empty gift states rather than deterministic fallback options in the UI layer.

### Risks

- Deterministic fallback still exists server-side in `lib/codex/gift-source.js` when live Codex is not requested; reviewers should distinguish API fallback from removed client-side silent recovery.
- Live Supabase remains required for the auth story in a credentialed recording.

### Verification

Commit `94de576` on `main`. Added regression coverage for cross-person signal rejection. Full check and browser smoke should pass through Docker:

```txt
scripts/container-run.sh npm run check
scripts/container-run.sh npm run check:browser
```

### Demo Impact

Selecting Elara no longer risked showing Torin or Lyra clue language in gift copy. The recording can honestly claim recipient-specific reasoning without hidden client fallbacks.

### Customer-Facing Context

Cross-person signal isolation is a trust control: automated gift suggestions must not leak one contact's context into another contact's recommendation surface.

### Next Recommended Step

Run one credentialed end-to-end recording path with live Supabase auth and live or deterministic Codex gift generation, confirming errors display cleanly when integrations are unavailable.
