# Architecture

Canonical architecture source of truth for Kinloop.

## Product Frame

Kinloop is a source-driven gift concierge. The user-facing app stays focused on birthdays, people, gift clues, approval, and reminder preferences. Runtime integrations and build techniques are documented here rather than exposed as product UI.

The app proves a tight commerce-adjacent product loop:

1. A user signs in with Supabase email/password auth.
2. The user runs synthetic data input from the checked-in source fixture.
3. Kinloop normalizes people, dates, interests, avoid lists, budgets, and source summaries from the synthetic email fixture.
4. The dashboard opens on the next birthday and presents a read-only gift brief.
5. Kinloop searches Shopify UCP Catalog MCP for product candidates when live product discovery is enabled.
6. Codex filters those candidates against the source clues, avoid list, budget, and birthday context.
7. Codex turns the curated relationship context and product candidates into structured gift ideas.
8. The user either approves one idea or sets reminder heartbeat timing from the dashboard.
9. Supabase records imported source summaries and approvals when configured; browser state keeps the local flow reliable.
10. Optional reminder preferences can be handed to the OpenClaw channel service when credentials and allowlists are verified.

## System Flow

```txt
 synthetic source fixture
  -> source normalizer
  -> Codex source analysis with deterministic fallback
  -> birthday dashboard
  -> product candidate source
  -> Shopify product candidates
  -> Codex candidate curation
  -> Codex structured transformation
  -> gift ideas
  -> user approval or reminder preference
  -> Supabase product memory or browser fallback
  -> OpenClaw preview or allowlisted reminder message boundary
```

## Standard Terms

| Term | Meaning |
|---|---|
| Kinloop app | The consumer-facing app surface for sources, people, gift ideas, approval, and reminder opt-in. |
| Source normalizer | Deterministic code that extracts people, interests, avoid lists, budget, deadline, and source text from the synthetic email fixture. |
| Shopify UCP Catalog MCP product source | Live catalog search source for product candidates, with mock retailer feed fallback when live discovery or curation cannot produce usable options. |
| Programmatic Codex transformation | Codex SDK workflow that filters product candidates and turns source context into structured gift ideas. |
| Supabase product memory | Durable auth, imported summary, recipient, gift option, approval, reminder, and event state. |
| Local resilience | Browser/file-backed state that keeps the recording path usable when credentials are unavailable. |
| Codex build subagents | Codex implementation/review workers used during build work. They are not shipped as runtime product agents. |
| OpenClaw channel service | Messaging, routing, and CLI boundary for allowlisted reminder outreach. |

## Runtime Ownership

| Layer | Owner | Submission posture |
|---|---|---|
| Web app | Next app in `app/` | Primary product surface |
| Auth | Supabase Auth | Real email/password sign-in path when credentials are configured |
| Source intake | Checked-in synthetic source bundle | Primary deterministic local path |
| Source normalization | `lib/source-people.js`, `lib/signals/email-signal.js`, and source-bundle mapping | Deterministic, tested extraction |
| Product source | `lib/product-source.js` | Shopify UCP Catalog MCP first when enabled, mock retailer feed fallback |
| Programmatic Codex | `@openai/codex-sdk` in `/api/codex/gift-source` | Candidate curation and structured gift transformation |
| Schema guardrails | Structured Codex output validation | Prevents unbounded product output |
| Persistence | Supabase plus local resilience | Durable product path plus reliable recording path |
| OpenClaw | OpenClaw channel service | Optional live reminder channel when credentials and allowlists are verified |

## Safety Invariants

- No real purchase.
- No auto-purchase.
- No payment processing.
- No fulfillment.
- No real iMessage scraping.
- No continuous inbox indexing.
- Approval creates a gift approval record, not a purchase.
- Product approval state belongs to the app/Supabase path, not OpenClaw.
- Source reads must be explicit, credentialed, and limited to configured channels.
- Codex output must validate against a structured schema before reaching the approval surface.

## Integration Boundaries

Supabase is the durable product system of record for authenticated runs. Local resilience exists so the app can continue if credentials, network, or auth state fails.

The primary source path is the checked-in synthetic fixture (`data/kinloop/synthetic-source-sample.json`). Dashboard people are derived from that fixture, not from a separate `people.json` seed.

Codex SDK is the primary in-app Codex story. Codex CLI auth can be used locally for recording; production should use a scoped server-side secret.

Shopify UCP Catalog MCP is the product candidate source when configured through `SHOPIFY_UCP_MCP_ENDPOINT` or `SHOPIFY_STOREFRONT_DOMAIN`. The committed mock retailer feed exists for deterministic tests and recording continuity, not as a fixed production catalog.

OpenClaw is a channel service for reminders, routing, and CLI operations. It is not the recommender, approval owner, payment layer, or memory layer.

The dashboard reminder splash opens a timing modal and records the selected heartbeat timing rather than sending immediately. When a heartbeat determines the deadline is near, the OpenClaw channel service can produce or send the Discord payload behind explicit credentials, consent, and allowlisted targets.

## Gift Source Route

`/api/gift-source` is the backend centerpiece for the demo. It accepts either the current simple UI request or a richer relationship brief:

- `personId`
- `input`
- `brief` with name, relationship, birthday, timing, budget, clues, avoid list, and source text
- `sourceSignal` from email ingestion when available
- `preferLive` to request live Codex/catalog paths

The route normalizes that request into a relationship brief, loads product candidates from Shopify UCP Catalog MCP with local catalog fallback, runs Codex candidate curation when live credentials are enabled, runs the Codex structured transformation, validates three approval-ready options, and returns metadata useful for the code walkthrough. Shopify supplies product candidates; Codex filters candidate fit and performs the relationship/source-to-gift transformation. The product UI consumes only the shopper-safe option fields.

## Verification Themes

Implementation work should preserve checks for:

- app build and tests
- UI copy avoiding internal labels in the product surface
- browser smoke through source import, gift reveal, approval, and dashboard reminder opt-in
- source intake fail-closed behavior for synthetic and optional live checks
- Supabase auth/read/write checks
- Codex SDK output shape and local resilience shape
- Shopify product-source fallback behavior
- OpenClaw allowlist and no-unverified-send behavior
- docs/source-of-truth consistency
- absence of real payment, fulfillment, or unconsented private-data paths
