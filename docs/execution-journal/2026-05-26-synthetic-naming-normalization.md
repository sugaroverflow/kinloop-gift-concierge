## 2026-05-26T22:28:00Z - Synthetic Naming Normalization

### Goal

Remove remaining AgentMail naming relics from the synthetic fixture path and normalize naming to synthetic-source terminology.

### Changes

- Renamed fixture file:
  - `data/kinloop/agentmail-inbox-sample.json` -> `data/kinloop/synthetic-source-sample.json`
- Updated imports/references to new fixture path:
  - `app/kinloop-app.jsx`
  - `scripts/check-codex-live.mjs`
  - `README.md`
  - `AGENTS.md`
  - `docs/architecture.md`
  - `data/kinloop/README.md`
- Replaced legacy signal labels:
  - `kinloop_agentmail` -> `kinloop_synthetic_source`
  - `agentmail:sample_` -> `synthetic:sample_`
  - `kinloop-agent@agentmail.to` -> `kinloop-synthetic@local`
- Updated signal generator defaults in `lib/signals/email-signal.js` to synthetic naming.
- Updated tests that asserted old source labels:
  - `tests/agentmail-signal.test.mjs`
  - `tests/codex-gift-source.test.mjs`
  - `tests/product-source.test.mjs`

### Decisions

- Keep existing fixture structure and parsing logic while normalizing names to avoid broad schema churn.
- Preserve deterministic synthetic behavior and tests while removing provider-branded naming.

### Tradeoffs

- Historical execution journal entries retain prior naming by design as chronological build history.

### Risks

- Downstream ad-hoc scripts outside the repo that referenced the old filename may need manual updates.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run check
scripts/container-run.sh npm run check:browser
```

Results:

- Full check passed (`docs`, `ui-copy`, tests, build)
- Unit/integration tests passed (`42/42`)
- Browser smoke passed (`1/1`)

### Demo Impact

The demo path and behavior are unchanged; terminology is cleaner and matches the synthetic-only product scope.

### Customer-Facing Context

Naming now reflects deterministic synthetic source behavior and avoids implying a live inbox dependency.

### Next Recommended Step

If desired, rename legacy test filenames (for example `agentmail-signal.test.mjs`) to neutral synthetic-source names for full semantic consistency.
