# Kinloop Data

These JSON files are the local product records for Kinloop's source-driven gift workflow. The primary product source is Shopify UCP Catalog MCP when configured; the mock retailer feed is the deterministic fallback for tests, local development, and recording continuity.

They should stay production-shaped:

- stable ids
- relationship summaries
- evidence labels
- Shopify-compatible catalog ids/SKUs
- merchant and delivery fields
- avoid-list and privacy boundaries

| File | Purpose |
|---|---|
| [people.json](people.json) | Birthday people, preferences, and source summaries |
| [mock-product-feed.json](mock-product-feed.json) | Mock retailer feed used only when Shopify UCP Catalog MCP is unavailable |
| [agentmail-inbox-sample.json](agentmail-inbox-sample.json) | Sample AgentMail inbox import for testing and OpenClaw agent contract |

They must not include real private messages, real addresses, payment data, customer records, secrets, or API keys.

Kinloop can query Shopify UCP Catalog MCP for live product discovery when enabled by `SHOPIFY_UCP_MCP_ENDPOINT` or `SHOPIFY_STOREFRONT_DOMAIN`. The checked-in product feed must not be treated as a fixed production catalog.

Regenerate the inbox sample fixture after editing `sample-emails/outbox/`:

```txt
node scripts/build-agentmail-sample-fixture.mjs
```
