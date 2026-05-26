# Kinloop

Kinloop is a source-driven gift concierge app.

It helps a user import relationship context from a synthetic fixture, discover upcoming birthdays, reveal gift ideas from the configured product path, approve one idea, and schedule a reminder before the decision deadline.

## Product Focus

### Purpose

Kinloop is a gift concierge for people who care about birthdays but do not want to manage gift logistics by hand.

### Users

- A busy gift giver who wants thoughtful ideas before a birthday deadline.

### Principles

- Consumer product first.
- Source-driven suggestions beat generic shopping prompts.
- Gift approval stays explicit and separate from purchasing, payment, and fulfillment.
- The flow should feel useful in under one minute.

## Core Capabilities

| Area | Kinloop path |
|---|---|
| Product flow | Synthetic source import to gift approval and reminder opt-in |
| Login / authorization | Supabase auth surface with local fallback for offline development |
| Data persistence | Supabase product memory plus browser state fallback |
| Tests | `npm run check` covers docs, UI copy, unit/integration tests, and build; browser smoke runs separately with `npm run check:browser` |
| Programmatic Codex | `@openai/codex-sdk` powers structured gift idea generation |
| Product source | Shopify UCP Catalog MCP when configured, mock retailer feed fallback for deterministic runs |
| Reminder channels | OpenClaw preview/send boundary and optional Twilio voice reminder path |

## Product Flow

```txt
Open Kinloop
  -> sign in or continue on this device
  -> run synthetic data input
  -> review the upcoming birthday dashboard
  -> find a recommended gift
  -> approve one idea
  -> save reminder timing
```

## Boundaries

- No purchase execution.
- No payment processing.
- No fulfillment.
- No autonomous external send.
- No continuous inbox indexing.
- Approval records a gift decision; it does not place an order.

## Run And Verify

Use Docker for local installs, tests, builds, and the dev server. The helper scripts load `.env.local` before entering Docker, so keep live credentials there and never commit them.

```txt
scripts/container-run.sh npm run check
scripts/container-run.sh npm run browser:install
scripts/container-run.sh npm run check:browser
```

Start the app:

```txt
docker compose run -d --service-ports --name codex_project-dev app npm run dev
```

Stop it:

```txt
docker stop codex_project-dev
```

## Live Codex Path

For local development, Codex CLI auth avoids pasting a raw API key into project files.

```txt
codex login
```

Put this in `.env.local`:

```txt
CODEX_USE_CLI_AUTH=1
CODEX_LIVE=1
```

Verify:

```txt
scripts/container-run.sh npm run check:codex-live
```

## Source And Product Paths

Kinloop uses `data/kinloop/synthetic-source-sample.json` as the canonical local source fixture. This is the default app path for repeatable local runs.

```txt
SHOPIFY_UCP_MCP_ENDPOINT=https://catalog.shopify.com/api/ucp/mcp
```

Optional integration checks:

```txt
scripts/container-run.sh npm run check:supabase-live
scripts/container-run.sh npm run check:openclaw-live
scripts/container-run.sh npm run check:voice-live
```

For a real allowlisted OpenClaw CLI send, set:

```txt
OPENCLAW_MODE=cli
OPENCLAW_CLI_EXECUTE=1
OPENCLAW_TEST_TARGET=<allowlisted target>
OPENCLAW_TARGET_ALLOWLIST=<same allowlisted target>
```

Leave `OPENCLAW_MODE=preview` for normal development unless you intentionally want to prove the live channel boundary.

## Docs Map

| File | Owns |
|---|---|
| [DESIGN.md](DESIGN.md) | Visual direction and interaction quality bar |
| [AGENTS.md](AGENTS.md) | Repo operating rules for Codex work |
| [docs/architecture.md](docs/architecture.md) | Runtime boundaries and safety invariants |
| [docs/ui-architecture.md](docs/ui-architecture.md) | Screen model, copy rules, and product state |
| [docs/execution-journal/](docs/execution-journal/) | Build narrative, integration decisions, and agent-harness notes |
| [docs/future-considerations.md](docs/future-considerations.md) | Non-MVP research directions |
| [docs/container-workflow.md](docs/container-workflow.md) | Docker workflow |
