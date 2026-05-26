# Architecture

Canonical architecture source of truth for Kinloop.

## Product Frame

Kinloop is a source-driven gift concierge. The user-facing app stays focused on birthdays, people, gift clues, approval, and reminder preferences. Runtime integrations and build techniques are documented here rather than exposed as product UI.

The app proves a tight commerce-adjacent product loop:

1. A user signs in or continues on the current device.
2. Kinloop imports a relationship source bundle.
3. The source bundle is normalized into people, birthdays, interests, avoid lists, budgets, and source summaries.
4. Kinloop searches Shopify UCP Catalog MCP for product candidates when live product discovery is enabled, falling back to the mock retailer feed when unavailable.
5. Codex turns the relationship context and product candidates into structured gift ideas.
6. The user approves one idea.
7. Supabase records durable state when configured; browser state keeps the local flow reliable.
8. Optional reminder preferences can be handed to the OpenClaw channel service when credentials and allowlists are verified.

## System Flow

```txt
source bundle or connected source
  -> signal normalizer
  -> product candidate source
  -> Codex structured transformation
  -> gift ideas
  -> user approval
  -> Supabase product memory or browser fallback
  -> reminder preference
```

## Standard Terms

| Term | Meaning |
|---|---|
| Kinloop app | The consumer-facing app surface for sources, people, gift ideas, approval, and reminder opt-in. |
| Birthday Watch runtime agents | OpenAI Agents SDK product agents planned for relationship/date monitoring. |
| Source normalizer | Deterministic code that extracts interests, avoid lists, budget, deadline, and source text. |
| Shopify UCP Catalog MCP product source | Live catalog search source for product candidates when configured, with mock retailer feed fallback. |
| Programmatic Codex transformation | Codex SDK workflow that turns source context and product candidates into structured gift ideas. |
| Supabase product memory | Durable auth, recipient, gift option, approval, and event state. |
| Local resilience | Browser/file-backed state that keeps the recording path usable when credentials are unavailable. |
| Codex build subagents | Codex implementation/review workers used during build work. They are not shipped as runtime product agents. |
| OpenClaw channel service | Messaging, routing, CLI, and voice boundary for allowlisted reminders. |
| Product heartbeat engine | Deterministic T-7/T-3/T-1 reminder orchestration. |
| MCP operator/build bridge | Read-only or tightly scoped context bridge for docs, diagnostics, and operator workflows. |

## Runtime Ownership

| Layer | Owner | Submission posture |
|---|---|---|
| Web app | Next app in `app/` | Primary product surface |
| Auth | Supabase Auth | Real sign-in path when credentials are configured |
| Source intake | AgentMail route plus checked-in source bundle | Live path optional, local path deterministic |
| Source normalization | `lib/signals/email-signal.js` and source-bundle mapping | Deterministic, tested extraction |
| Product source | `lib/product-source.js` | Shopify UCP Catalog MCP first when enabled, mock retailer feed fallback |
| Programmatic Codex | `@openai/codex-sdk` in `/api/codex/gift-source` | Primary in-app AI capability |
| Schema guardrails | Structured Codex output validation | Prevents unbounded product output |
| Persistence | Supabase plus local resilience | Durable product path plus reliable recording path |
| Reminders | Product heartbeat engine | Deterministic scheduling logic |
| OpenClaw | OpenClaw channel service | Optional live reminder channel when credentials and allowlists are verified |
| MCP | MCP operator/build bridge | Build/operator context, not product approval state |

## Safety Invariants

- No real purchase.
- No auto-purchase.
- No payment processing.
- No fulfillment.
- No real iMessage scraping.
- No continuous inbox indexing.
- Approval creates a gift approval record, not a purchase.
- Unknown inbound channel replies cannot approve or change product state.
- Product approval state belongs to the app/Supabase path, not MCP or OpenClaw.
- Source reads must be explicit, credentialed, and limited to configured channels.
- Codex output must validate against a structured schema before reaching the approval surface.

## Integration Boundaries

Supabase is the durable product system of record. Local resilience exists so the recording can continue if credentials, network, or auth state fails.

AgentMail is one source intake layer. The MVP can import from a configured agent inbox or a checked-in synthetic source bundle. Production can add webhooks or OAuth source connectors.

Codex SDK is the primary in-app Codex story. Codex CLI auth can be used locally for recording; production should use a scoped server-side secret.

Shopify UCP Catalog MCP is the product candidate source when configured through `SHOPIFY_UCP_MCP_ENDPOINT` or `SHOPIFY_STOREFRONT_DOMAIN`. The committed mock retailer feed exists for deterministic tests and recording continuity, not as a fixed production catalog.

OpenClaw is a channel service for reminders, routing, CLI operations, and possible voice escalation. It is not the recommender, approval owner, payment layer, or memory layer.

MCP is useful for inspectable operator/build context. It should not hide product memory or approval decisions.

## Verification Themes

Implementation work should preserve checks for:

- app build and tests
- UI copy avoiding internal labels in the product surface
- browser smoke through source import, gift reveal, approval, and reminder opt-in
- source intake fail-closed behavior and live inbox check
- Supabase auth/read/write checks
- Codex SDK output shape and local resilience shape
- Shopify product-source fallback behavior
- OpenClaw allowlist and no-unverified-send behavior
- docs/source-of-truth consistency
- absence of real payment, fulfillment, or unconsented private-data paths
