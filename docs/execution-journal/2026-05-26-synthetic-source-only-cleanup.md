## 2026-05-26T20:09:00Z - Synthetic Source Only Cleanup

### Goal

Move Kinloop fully to the synthetic source-fixture route and remove obsolete sample-email maintenance assets.

### Changes

- Deleted `scripts/build-agentmail-sample-fixture.mjs`.
- Deleted the full `sample-emails/` content set (README and outbox message fixtures).
- Updated `data/kinloop/README.md` to remove regeneration instructions tied to `sample-emails` and to mark `agentmail-inbox-sample.json` as the canonical synthetic import fixture.

### Decisions

- Chose a single committed synthetic source artifact (`data/kinloop/agentmail-inbox-sample.json`) as the source path for local/demo/testing workflows.
- Removed dual-maintenance paths (plaintext sample inbox + generated JSON) to reduce repo complexity and drift.

### Tradeoffs

- Lost local tooling for regenerating the synthetic inbox JSON from threaded text files.
- Future changes to sample source signals now require direct JSON edits instead of script-based regeneration.

### Risks

- If future teams want richer synthetic inbox authoring workflows, they will need to reintroduce generation tooling.
- Historical references in old journals may still mention the removed fixture pipeline as context.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run check:docs
scripts/container-run.sh npm run test
```

Results:

- Docs check passed.
- Unit/integration tests passed (`47/47`).
- Repository search shows no remaining references to `sample-emails` or `build-agentmail-sample-fixture`.

### Demo Impact

Demo setup is simpler because the synthetic JSON source is now the only supported local source fixture path.

### Customer-Facing Context

This cleanup strengthens determinism and reduces operational ambiguity while preserving bounded source import behavior and approval safety constraints.

### Next Recommended Step

If desired, rename `agentmail-inbox-sample.json` to a more generic synthetic fixture name to reflect that it is no longer generated from inbox-thread plaintext assets.
