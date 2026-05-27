## 2026-05-26T22:20:00Z - README Architecture And App-Flow Refresh

### Goal

Refresh `README.md` so it accurately explains the current Kinloop app structure, architecture, feature set, and runtime flow after recent simplification and production-readiness passes.

### Changes

- Reviewed implementation structure across `app/`, `app/api/`, `lib/`, `data/kinloop/`, `tests/`, and `scripts/`.
- Reviewed architecture and UI guidance in `docs/architecture.md` and `docs/ui-architecture.md`.
- Reviewed execution-journal entries to extract current product direction and de-scoped paths.
- Rewrote `README.md` to include:
  - explicit app flow and feature table
  - implementation-oriented structure map
  - internal request/data flow narrative
  - integration mode/gate/fallback matrix
  - execution-journal-aligned build-direction summary
  - updated run/verify guidance while preserving required docs-map references

### Decisions

- Keep `README.md` as the single high-signal entrypoint for both product behavior and implementation orientation.
- Reflect the synthetic fixture path as canonical, with live integrations framed as optional and gated.
- Keep safety boundaries explicit and shopper-facing behavior separated from integration internals.

### Tradeoffs

- README is denser than a minimal app intro because it now doubles as architecture onboarding context.
- Detailed implementation references remain in architecture docs and journal entries rather than duplicating route-level internals in full.

### Risks

- Ongoing architecture changes may outpace README details if future updates are not maintained alongside implementation.
- Integration gate examples can drift if environment variable contracts change.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run check:docs
```

Result:

- Docs check passed (`8 files`, execution journal present).

### Demo Impact

The main entry document now supports a cleaner demo narrative by showing the exact product flow and clarifying where live integrations are optional versus default deterministic behavior.

### Customer-Facing Context

This documentation refresh improves trust framing by clearly describing bounded autonomy: Kinloop recommends and records decisions, while purchase and outbound send side effects remain constrained by explicit gates.

### Next Recommended Step

Run a full verification sweep (`scripts/container-run.sh npm run check` and `scripts/container-run.sh npm run check:browser`) when the current in-flight API route edits are finalized, then keep README/journal updates paired in future architecture-affecting changes.
