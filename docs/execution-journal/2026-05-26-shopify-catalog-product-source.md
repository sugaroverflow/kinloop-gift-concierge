## 2026-05-26T00:54:46Z - Shopify Catalog Product Source

### Goal

Move Kinloop away from a fixed trio of gift options and toward a real product discovery surface with deterministic fallback behavior.

### Changes

- Added a product-source layer that queries Shopify Catalog MCP/UCP when live product discovery is requested.
- Added a mock retailer product feed for local development, tests, and demos without network access.
- Updated Codex gift generation to receive ranked product feed candidates instead of a static three-item catalog.
- Updated OpenClaw reminder previews to use the same product-source layer.
- Added tests for Shopify MCP request shape, response normalization, global catalog defaulting, and fallback behavior.

### Decisions

- Shopify Catalog MCP/UCP is the preferred product source because it is a real catalog interface for agentic commerce.
- Kinloop defaults to Shopify Global Catalog MCP for live product requests unless `SHOPIFY_UCP_MCP_ENDPOINT` or `SHOPIFY_STOREFRONT_DOMAIN` targets a specific endpoint.
- The checked-in mock feed is a resilience path, not the product truth. It keeps local runs deterministic and safe.
- Codex remains bounded to source text, person profile, and product candidates. It does not browse broadly, purchase, or call external services.

### Tradeoffs

- The adapter normalizes several plausible UCP response shapes instead of depending on one narrow payload shape.
- The app still prepares approval options only; it does not create carts, check out, or process payment.
- Product-source fetches are covered with mocked responses. No live Shopify call was made during verification.

### Risks

- Shopify Catalog MCP response details may continue to evolve, so the normalization layer should stay covered by contract tests.
- Store-specific catalog quality depends on the configured Shopify store or global catalog relevance.
- Live catalog access requires network availability and a valid agent profile URL.

### Verification

- `npm test`
- `npm run check:docs`
- `npm run check:ui-copy`
- `scripts/container-run.sh npm run check`

### Demo Impact

Kinloop can now truthfully explain gift recommendations as source-derived and product-feed-backed. The fallback feed keeps the demo reliable, while the Shopify MCP path gives the technical walkthrough a real agentic commerce integration point.

### Customer-Facing Context

This keeps user approval separate from product discovery. Kinloop can discover candidate gifts from a commerce catalog, ask Codex to structure and explain the options, and still require the person to approve before any commerce handoff.

### Next Recommended Step

Run a live Shopify Catalog MCP smoke test against either the global endpoint or a specific storefront domain, then surface the product source label internally for debugging without exposing it as shopper-facing UI.
