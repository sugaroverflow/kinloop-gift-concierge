# Kinloop

Kinloop is a source-driven gift concierge.

It helps a user import relationship context, discover upcoming birthdays, reveal gift ideas from a product source, approve one idea, and opt into a reminder call before the decision deadline. The app surface is consumer-facing; the technical architecture is visible in the code and docs.

## What It Proves

| Requirement | Kinloop path |
|---|---|
| Working application | One focused flow from source import to gift approval and reminder opt-in |
| Login / authorization | Supabase auth surface with local fallback for recording continuity |
| Data persistence | Supabase product memory plus browser state fallback |
| Meaningful tests | Docs guard, UI copy guard, unit/integration tests, build, and browser smoke |
| Programmatic Codex | `@openai/codex-sdk` powers structured gift idea generation |
| Product source | Shopify UCP Catalog MCP when configured, mock retailer feed fallback for deterministic runs |
| Creativity | Relationship-source import plus product-feed-backed gift reveal |
| Communication | `docs/recording-script.md` gives the five-minute recording structure |

## Product Flow

```txt
Open Kinloop
  -> sign in or continue locally
  -> import connected sources
  -> review discovered people and birthdays
  -> edit essentials
  -> reveal gift ideas
  -> approve one idea
  -> opt into a reminder call
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

## Source And Product Paths

The checked-in sample source bundle is safe synthetic data for repeatable demos. Live source and product integrations are optional and credentialed.

```txt
AGENTMAIL_API_KEY=...
AGENTMAIL_INBOX_ID=kinloop-agent@agentmail.to
SHOPIFY_UCP_MCP_ENDPOINT=https://catalog.shopify.com/api/ucp/mcp
```

Useful checks:

```txt
scripts/container-run.sh npm run check:agentmail-live
scripts/container-run.sh npm run check:supabase-live
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
