# Kinloop

Kinloop is a Codex-powered gift approval cockpit.

```txt
Automate the gift search. Keep the human in the loop.
```

The app gives an agent-owned inbox to gift hints, imports the latest relationship signal from `kinloop-agent@agentmail.to`, searches a Shopify UCP Catalog MCP product source with a mock retailer feed fallback, asks Codex to convert that messy signal into structured gift options, and records the human approval.

## What It Proves

| Requirement | Kinloop path |
|---|---|
| Working application | One complete Sarah birthday flow from signal import to approval |
| Login / authorization | Supabase auth surface and repository integration |
| Data persistence | Supabase product memory with local resilience for recording continuity |
| Meaningful tests | Docs guard, UI copy guard, unit/integration tests, build, and browser smoke |
| Programmatic Codex | `@openai/codex-sdk` powers `/api/codex/gift-source` |
| Product source | Shopify UCP Catalog MCP when configured, mock retailer feed fallback for tests and recording continuity |
| Creativity | AgentMail inbox plus Codex Signal Studio creates a real signal-to-decision pipeline |
| Communication | `docs/recording-script.md` gives the five-minute recording structure |

## Product Flow

```txt
Open Kinloop
  -> review Sarah's birthday countdown
  -> import the latest AgentMail hint
  -> inspect the extracted relationship signal
  -> run Codex Signal Studio
  -> compare three approval-ready gifts
  -> approve one gift
  -> inspect the audit trail
```

## Boundaries

- No purchase execution.
- No payment processing.
- No fulfillment.
- No autonomous external send.
- No continuous inbox indexing.
- Approval records a gift decision; it does not place an order.

## Run And Verify

Use Docker for local installs, tests, builds, and the dev server.

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

For a local recording, Codex CLI auth avoids pasting a raw API key into project files.

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

Scoped-key alternative:

```txt
CODEX_API_KEY=sk-...
CODEX_LIVE=1
scripts/container-run.sh npm run check:codex-live
```

## AgentMail Path

Put this in `.env.local`:

```txt
AGENTMAIL_API_KEY=am_...
AGENTMAIL_INBOX_ID=kinloop-agent@agentmail.to
AGENTMAIL_INCLUDE_UNAUTHENTICATED=0
```

Verify:

```txt
scripts/container-run.sh npm run check:agentmail-live
```

## Optional Live Checks

Run these only when matching credentials, consent, and allowlists are configured.

```txt
scripts/container-run.sh npm run check:supabase-live
scripts/container-run.sh npm run check:supabase-live-records
scripts/container-run.sh npm run check:openclaw-live
```

## Docs Map

| File | Owns |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Product positioning and experience promise |
| [DESIGN.md](DESIGN.md) | Visual direction and interaction quality bar |
| [AGENTS.md](AGENTS.md) | Repo operating rules for Codex work |
| [docs/architecture.md](docs/architecture.md) | Runtime boundaries and safety invariants |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Remaining submission work |
| [docs/ui-architecture.md](docs/ui-architecture.md) | Screen model, copy rules, and product state |
| [docs/recording-script.md](docs/recording-script.md) | Five-minute recording script |
| [docs/future-considerations.md](docs/future-considerations.md) | Non-MVP research directions |
| [docs/container-workflow.md](docs/container-workflow.md) | Docker workflow |
