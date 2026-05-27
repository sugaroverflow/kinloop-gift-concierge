## 2026-05-26T19:58:00Z - Repository Cleanup Refactor

### Goal

Remove redundant or stale code/workflow surface area without changing the Kinloop product behavior.

### Changes

- Removed broken npm scripts that referenced missing files: `check:supabase-user` and `mcp:context`.
- Pruned unused exports from utility modules:
  - `canSendOpenClaw` from `lib/openclaw/modes.js`
  - `mockProductFeed` and `giftById` from `lib/product-data.js`
  - `getDataMode` from `lib/supabase/client.js`
  - `createAuditEvent` from `lib/persistence.js`
- Updated an execution journal verification snippet to match the Docker-first command policy.
- Clarified README test wording so `npm run check` and `npm run check:browser` are explicitly separated.

### Decisions

- Kept product-facing and architecture-boundary code paths intact (gift approval, OpenClaw reminder boundary, Twilio voice boundary, Supabase persistence path).
- Limited this refactor to high-confidence dead code and broken workflow entries to avoid regressing in-flight feature work.
- Treated historical journal and architecture docs as durable context, not cleanup candidates.

### Tradeoffs

- Deferred riskier removals (heartbeat route scaffolding, parse-reply test utility path, legacy prototype directory investigation) pending explicit product intent confirmation.
- Chose script removal over adding placeholder replacements for missing script files, to keep the workflow surface truthful to current implementation.

### Risks

- Heartbeat reminder orchestration remains lightly integrated and currently under-tested.
- `/api/voice/status` remains untested relative to other voice endpoints.
- Repository still contains additional non-MVP/legacy material that may be intentionally retained.

### Verification

Executed via Docker:

```txt
scripts/container-run.sh npm run check:docs
scripts/container-run.sh npm run test
```

Results:

- Docs check passed.
- Unit/integration tests passed (`43/43`).

### Demo Impact

Demo reliability improves because local commands now reflect actual runnable workflows and avoid dead script paths.

### Customer-Facing Context

This refactor strengthens operational trust by reducing stale interfaces while preserving explicit human approval boundaries and safe fallback behavior in the product flow.

### Next Recommended Step

Add targeted tests for heartbeat and voice status routes, then decide whether to retain or remove larger legacy scaffold areas after product-owner confirmation.
