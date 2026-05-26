# Kinloop Data

These JSON files are the local source and product records for Kinloop's source-driven gift workflow. The primary live product source is Shopify UCP Catalog MCP; Codex curates returned candidates against the source clues and avoid list. The mock retailer feed is the deterministic fallback when live discovery or curation cannot produce usable options.

They should stay production-shaped:

- stable ids
- relationship summaries
- evidence labels
- Shopify-compatible catalog ids/SKUs
- merchant and delivery fields
- avoid-list and privacy boundaries

| File | Purpose |
|---|---|
| [mock-product-feed.json](mock-product-feed.json) | Mock retailer feed used only when Shopify UCP Catalog MCP is unavailable |
| [synthetic-source-sample.json](synthetic-source-sample.json) | Canonical synthetic relationship-source fixture for local runs and tests; dashboard people are derived from this file |

They must not include real private messages, real addresses, payment data, customer records, secrets, or API keys.

Kinloop can query Shopify UCP Catalog MCP for live product discovery when enabled by `SHOPIFY_UCP_MCP_ENDPOINT` or `SHOPIFY_STOREFRONT_DOMAIN`. The checked-in product feed must not be treated as a fixed production catalog.

`synthetic-source-sample.json` is maintained as a checked-in synthetic fixture and is the canonical local import source for tests and demo runs. Do not add a separate static people fixture; keep recipient context source-derived.
