## 2026-05-26T22:47:00Z - Challenge Alignment Implementation

### Goal

Align Kinloop with the interview challenge requirements: real auth, durable state, meaningful tests, programmatic Codex, source-derived people, and a clearer demo story.

### Changes

- Replaced the static `people.json` dependency with `lib/source-people.js`, which derives dashboard people, summaries, clues, avoid lists, budgets, and Codex-ready source text from `data/kinloop/synthetic-source-sample.json`.
- Removed the confusing `/api/giftsource` alias and kept `/api/gift-source` as the canonical product API.
- Added Supabase email/password sign-in and sign-out helpers, wired them into the product entry screen, and kept the current-device fallback explicit.
- Added Supabase persistence helpers for imported synthetic people/summaries, approvals, and reminder preferences.
- Tightened gift copy fallbacks so merchant checkout placeholders do not appear in the recommendation hero.
- Updated tests, docs, and the gitignored demo storyboard to reflect source-derived people, real auth, persistence, Shopify MCP product sourcing, and runtime Codex transformation.

### Decisions

- The synthetic email fixture is now the canonical local people source; there is no separate checked-in people seed.
- Shopify UCP Catalog MCP remains the product candidate source when available. Codex remains the relationship/source-to-gift transformation layer.
- Supabase is the primary durable path for authenticated runs, while browser state remains a demo resilience fallback.
- The demo story should distinguish build-time Codex usage (Codex CLI, `/goal/`, Codex Cloud) from runtime Codex SDK usage inside the app.

### Tradeoffs

- Birthday/timing/address defaults still live in code because the synthetic fixture does not encode every product-facing field directly.
- Source summaries persist through `people` rows and audit metadata rather than inserting every synthetic email as a durable `source_signals` row, avoiding duplicate signal writes without a unique source constraint.
- Browser smoke continues to use the current-device fallback so it remains deterministic without live Supabase credentials.

### Risks

- Live Supabase persistence depends on the configured schema and credentials matching the repository migration.
- Live Shopify MCP and Codex paths still need credentialed checks for a recording that wants to show those integrations running live.
- The synthetic fixture uses source names like Elara Moonwell and Torin Oakenspire, so demo narration should use those names rather than the removed static seed names.

### Verification

Executed inside Docker:

```txt
scripts/container-run.sh npm run test
scripts/container-run.sh npm run check
scripts/container-run.sh npm run check:browser
```

Results:

- Unit/integration tests passed (`47/47`).
- Full check passed: docs, UI copy, unit/integration tests, and production build.
- Browser smoke passed through sign-in fallback, synthetic import, dashboard, gift reveal, approval, and reminder preference.

### Demo Impact

The product now maps more directly to the rubric: the user can sign in with a real Supabase auth path, import synthetic email source data, see people and summaries derived from that source, ask the app for Codex-shaped gift ideas, approve one, and persist the decision path.

### Customer-Facing Context

Kinloop demonstrates bounded agentic commerce: source analysis and gift reasoning are automated, but approval, reminder timing, payment, fulfillment, and external sends remain explicit and controlled.

### Next Recommended Step

Before recording, run the live Supabase and Codex checks with demo credentials and decide whether the video should show live integration metadata or the deterministic fallback path.

## 2026-05-26T23:20:00Z - Synthetic Character Clue Diversity Fix

### Goal

Fix the imported people summaries so each synthetic character presents distinct interests instead of over-repeating espresso, pottery, and hosting.

### Changes

- Added explicit clue and avoid defaults per synthetic person in `lib/source-people.js`.
- Added raw-message topic extraction as a fallback for unknown fixture people, while ignoring formatted `sourceText` lines that contain noisy generated `Interests:` metadata.
- Expanded `tests/synthetic-signal.test.mjs` to assert distinct clue profiles for Elara, Torin, Lyra, Celeste, and Rowan.

### Decisions

The dashboard should prefer the curated character-level clue set for known synthetic fixture people because the fixture's generated extracted-interest metadata is too noisy for a polished demo.

### Tradeoffs

This keeps birthday, address, tone, clue, and avoid defaults in code until those product-facing fields are fully represented in the synthetic source fixture itself.

### Risks

The formatted Codex-ready source text still includes the older extracted-interest lines for auditability and prompt context. Gift generation must continue to rely on the structured `person.clues` field where possible.

### Verification

Executed inside Docker:

```txt
scripts/container-run.sh npm run check
```

Results: docs check, UI copy check, unit/integration tests (`48/48`), and production build passed. The Docker dev app was restarted afterward.

### Demo Impact

The people dashboard now shows a better spread: Elara for pottery/espresso/hosting, Torin for desk coffee/cycling/cookbooks, Lyra for textiles/plants/design books, Celeste for gardening/tea/journaling, and Rowan for activism/journalism/fundraising.

### Customer-Facing Context

This makes the source-to-profile transformation easier to explain: Kinloop can normalize noisy source analysis into bounded, reviewable product memory instead of blindly exposing every generated label.

### Next Recommended Step

Revisit the synthetic fixture after the interview if the team wants every product-facing field to be encoded directly in source data rather than in code-side fixture defaults.
