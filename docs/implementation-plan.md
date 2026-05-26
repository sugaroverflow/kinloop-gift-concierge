# Implementation Plan

This plan tracks the remaining work for the Kinloop submission. Architecture ownership lives in `docs/architecture.md`; UI ownership lives in `docs/ui-architecture.md`.

## Finish Line

Submit code plus a five-minute recording that proves:

- A working app with one polished gift approval workflow.
- Login/authorization through Supabase.
- Data persistence through Supabase plus reliable local resilience.
- Meaningful tests and build checks.
- Programmatic Codex inside the app through the Codex SDK.
- Real signal intake from an agent-owned inbox.
- Clear safety boundaries: no purchase, no payment, no unattended external send.

## Target Flow

```txt
open Kinloop
  -> see Sarah's birthday countdown
  -> import latest AgentMail hint
  -> review extracted relationship signal
  -> run Codex Signal Studio
  -> compare three gift options
  -> approve one gift
  -> inspect audit trail
```

## Remaining Work

| Priority | Task | Acceptance criteria | Verify |
|---|---|---|---|
| P0 | Kinloop-only repo | Root docs, scripts, data labels, and tests describe only the Kinloop vision | `scripts/container-run.sh npm run check:docs`; repo text scan |
| P0 | Product cockpit | Main app presents one focused Sarah flow with signal intake, Codex transformation, options, approval, and audit trail | Browser smoke and manual recording pass |
| P0 | Codex options schema | Codex route returns three structured gift options from one imported signal | Node tests for schema; browser flow |
| P0 | AgentMail live check | Credentialed script verifies the latest inbox message can be listed/fetched and normalized | `scripts/container-run.sh npm run check:agentmail-live` |
| P0 | Approval memory | Persist imported signal, generated options, approval, and audit event with approval-first names | Repository tests and Supabase live check |
| P0 | Final full check | Default checks and browser smoke pass from the submission state | `scripts/container-run.sh npm run check`; `scripts/container-run.sh npm run check:browser` |
| P1 | Generated assets | Replace remote photos with committed anime-style portraits and gift imagery | Visual QA, browser screenshots |
| P1 | OpenClaw proof | Run one allowlisted reminder send only if the VPS/channel path is verified | `scripts/container-run.sh npm run check:openclaw-live` |
| P1 | Responsive QA | Core flow is usable on desktop and mobile viewports | Browser screenshots or Playwright viewport pass |

## Cut List

Do not add these to the submission path:

- real purchase execution
- payment processing
- fulfillment
- Shopify merchant integration
- continuous inbox indexing
- broad catalog search
- autonomous purchasing
- runtime swarms
- external MCP ownership of approval state

## Stop Conditions

- If live Codex is unavailable, use the validated local resilience path and explain the bounded Codex route in the build section.
- If AgentMail credentials are unavailable, show the route failing closed and use a prepared source text only for recording continuity.
- If Supabase is unavailable, show the auth surface and rely on local resilience for the product flow.
- If OpenClaw is not verified, keep it out of the product recording and describe it only as an optional channel boundary.
- If any credential appears in tracked files, rotate it and remove it before continuing.

## Review Checkpoints

| Review | Scope |
|---|---|
| UI/Impeccable | One focused cockpit, strong visual hierarchy, no internal labels in product UI |
| Security/privacy | No secrets, no raw private content committed, no purchase/payment/send side effects |
| Tests/build | Checks are reproducible in Docker |
| Recording readiness | Recording proves real signal intake, Codex transformation, approval, persistence, and tests |

## Current Phase Summary

The submission architecture is a narrow agent inbox to approval pipeline. The current phase is Kinloop-only hardening: keep docs non-redundant, preserve the working flow, and verify the repo end to end.
