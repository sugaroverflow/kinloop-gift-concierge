# Implementation Plan

This plan tracks the remaining work for the Kinloop submission. Architecture ownership lives in `docs/architecture.md`; UI ownership lives in `docs/ui-architecture.md`.

## Finish Line

Submit code plus a five-minute recording that proves:

- A working app with one polished source-to-gift workflow.
- Login/authorization through Supabase.
- Data persistence through Supabase plus reliable local resilience.
- Meaningful tests and build checks.
- Programmatic Codex inside the app through the Codex SDK.
- Source-driven gift context through AgentMail or the checked-in source bundle.
- Product-feed-backed ideas through Shopify UCP Catalog MCP or mock retailer fallback.
- Clear safety boundaries: no purchase, no payment, no unattended external send.

## Target Flow

```txt
open Kinloop
  -> sign in or continue locally
  -> import connected sources
  -> review discovered people and birthdays
  -> edit essentials
  -> reveal gift ideas
  -> approve one idea
  -> opt into a reminder call
```

## Remaining Work

| Priority | Task | Acceptance criteria | Verify |
|---|---|---|---|
| P0 | Product-first UI | Main app presents source import, people, gift reveal, approval, and reminder opt-in without internal labels | Browser smoke and manual recording pass |
| P0 | Codex options schema | Gift route returns three structured gift ideas from one imported source context | Node tests for schema; browser flow |
| P0 | Product source | Product candidates come from Shopify UCP Catalog MCP when configured and from mock retailer feed fallback otherwise | `scripts/container-run.sh npm run test -- tests/product-source.test.mjs` |
| P0 | Source intake | Credentialed script verifies the latest inbox message can be listed/fetched and normalized | `scripts/container-run.sh npm run check:agentmail-live` |
| P0 | Approval memory | Persist generated options, approval, and reminder preference with product-first names | Repository tests and Supabase live check |
| P0 | Final full check | Default checks and browser smoke pass from the submission state | `scripts/container-run.sh npm run check`; `scripts/container-run.sh npm run check:browser` |
| P1 | Generated assets | Add committed anime-style portraits and gift imagery | Visual QA, browser screenshots |
| P1 | OpenClaw proof | Run one allowlisted reminder send only if the VPS/channel path is verified | `scripts/container-run.sh npm run check:openclaw-live` |
| P1 | Responsive QA | Core flow is usable on desktop and mobile viewports | Browser screenshots or Playwright viewport pass |

## Cut List

Do not add these to the submission path:

- real purchase execution
- payment processing
- fulfillment
- Shopify checkout, cart, or merchant handoff
- continuous inbox indexing
- unbounded broad catalog browsing
- autonomous purchasing
- runtime swarms
- external MCP ownership of approval state

## Stop Conditions

- If live Codex is unavailable, use the validated local resilience path and explain the bounded Codex route in the build section.
- If live source credentials are unavailable, use the checked-in source bundle for recording continuity.
- If Supabase is unavailable, show the auth surface and rely on browser persistence for the product flow.
- If OpenClaw is not verified, keep live sending out of the product recording and describe it only as an optional channel boundary.
- If any credential appears in tracked files, rotate it and remove it before continuing.

## Review Checkpoints

| Review | Scope |
|---|---|
| UI/Impeccable | Product-first flow, strong hierarchy, no internal labels in product UI |
| Security/privacy | No secrets, no raw private content committed, no purchase/payment/send side effects |
| Tests/build | Checks are reproducible in Docker |
| Recording readiness | Recording proves source import, gift reveal, approval, persistence, and tests |

## Current Phase Summary

The current phase is product-surface hardening. The architecture is in place; the priority is making the UI feel like a real consumer product while preserving the working Codex, product-source, persistence, and reminder boundaries.
