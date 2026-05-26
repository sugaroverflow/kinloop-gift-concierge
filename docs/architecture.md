# Architecture

Canonical architecture source of truth for Kinloop.

## Product Frame

Kinloop is an agentic gift approval cockpit.

```txt
Automate the gift search. Keep the human in the loop.
```

The app proves a tight commerce-adjacent product loop:

1. A user opens Sarah's birthday workflow.
2. Kinloop imports a relationship hint from `kinloop-agent@agentmail.to`.
3. The signal is normalized into structured gift context.
4. Kinloop searches Shopify UCP Catalog MCP for product candidates, falling back to the mock retailer feed when unavailable.
5. Codex turns the signal and product candidates into approval-ready gift options.
6. The user approves one option.
7. Supabase records audit events and the gift approval when configured.

## System Flow

```txt
AgentMail signal inbox
  -> /api/signals/agentmail
  -> signal normalizer
  -> Shopify UCP Catalog MCP product source
  -> /api/codex/gift-source
  -> Codex SDK transformation
  -> structured gift option schema
  -> human approval UI
  -> Supabase product memory
  -> audit trail
```

## Standard Terms

| Term | Meaning |
|---|---|
| Kinloop cockpit | The user-facing app surface for birthday context, signal intake, Codex transformation, and approval. |
| AgentMail signal inbox | `kinloop-agent@agentmail.to`, a real agent-owned inbox for incoming gift hints. |
| Signal normalizer | Deterministic code that extracts sender, subject, interests, avoid list, budget, deadline, and source text. |
| Shopify UCP Catalog MCP product source | Live catalog search source for product candidates when configured, with mock retailer feed fallback. |
| Codex Signal Studio | The in-app Codex workflow that turns messy signal text into structured gift options. |
| Supabase product memory | Durable auth, recipient, gift option, approval, and audit state. |
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
| Signal intake | AgentMail REST API | Real inbox integration through `/api/signals/agentmail` |
| Signal normalization | `lib/signals/email-signal.js` | Deterministic, tested extraction |
| Product source | `lib/product-source.js` | Shopify UCP Catalog MCP first when configured; mock retailer feed fallback |
| Programmatic Codex | `@openai/codex-sdk` in `/api/codex/gift-source` | Primary in-app AI capability |
| Schema guardrails | Structured Codex output validation | Prevents unbounded product output |
| Persistence | Supabase plus local resilience | Durable product path plus reliable recording path |
| Auditability | App/Supabase audit events | Shows signal import, Codex generation, and approval |
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
- AgentMail reads must be explicit, credentialed, and limited to the configured agent inbox.
- Codex output must validate against a structured schema before reaching the user-facing approval surface.

## Integration Boundaries

Supabase is the product system of record. Local resilience exists so the recording can continue if credentials, network, or auth state fails.

AgentMail is the signal intake layer. The MVP uses on-demand message import from the configured agent inbox. Production can use AgentMail webhooks for real-time ingestion.

Codex SDK is the primary in-app Codex story. Codex CLI auth can be used locally for recording; production should use a scoped server-side secret.

Shopify UCP Catalog MCP is the product candidate source when configured through `SHOPIFY_UCP_MCP_ENDPOINT` or `SHOPIFY_STOREFRONT_DOMAIN`. The committed mock retailer feed exists for deterministic tests and recording continuity, not as a fixed production catalog.

OpenClaw is a channel service for reminders, routing, CLI operations, and possible voice escalation. It is not the recommender, approval owner, payment layer, or memory layer.

MCP is useful for inspectable operator/build context. It should not hide product memory or approval decisions.

## Verification Themes

Implementation work should preserve checks for:

- app build and tests
- UI copy avoiding internal labels in the product surface
- browser smoke through signal import, Codex generation, and approval
- AgentMail route fail-closed behavior and live inbox check
- Supabase auth/read/write checks
- Codex SDK output shape and local resilience shape
- product heartbeat state transitions
- OpenClaw allowlist and no-unverified-send behavior
- docs/source-of-truth consistency
- absence of real payment, fulfillment, or unconsented private-data paths
