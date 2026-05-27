## 2026-05-26T22:26:00Z - AgentMail Runtime De-scope

### Goal

Remove remaining optional live AgentMail runtime paths and keep the repository focused on the synthetic-first production path.

### Changes

- Removed live AgentMail API/runtime code:
  - deleted `app/api/signals/agentmail/route.js`
  - deleted `lib/agentmail/inbox.js`
  - deleted `scripts/check-agentmail-live.mjs`
- Removed `check:agentmail-live` from `package.json`.
- Removed AgentMail env wiring from:
  - `docker-compose.yml`
  - `.env.example`
  - `README.md` optional integration checks block
- Trimmed `tests/agentmail-signal.test.mjs` to keep signal-normalization coverage only (removed runtime/config route assertions).
- Updated `docs/architecture.md` wording to remove optional live AgentMail route framing.
- Updated synthetic fixture metadata description in `data/kinloop/agentmail-inbox-sample.json` to reflect canonical synthetic usage.

### Decisions

- Treat `data/kinloop/agentmail-inbox-sample.json` as the only source-intake path for app/runtime scope.
- Keep signal parsing utilities because they are still used for deterministic fixture normalization behavior and tests.

### Tradeoffs

- Removed optional live inbox intake flexibility from this repo scope.
- Future live-source intake work will require fresh implementation instead of toggling back a hidden path.

### Risks

- Historical journals still mention earlier AgentMail-live checks; this is expected as build history.
- Fixture internals still carry `kinloop_agentmail` labels for compatibility with existing signal-format tests.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run check
scripts/container-run.sh npm run check:browser
```

Results:

- Full check passed (docs, UI copy, tests, build)
- Unit/integration tests passed (`42/42`)
- Browser smoke passed (`1/1`)

### Demo Impact

Demo setup is simpler and more deterministic: no optional live inbox dependency remains.

### Customer-Facing Context

The shipped product path is clearer and less error-prone because non-default source-ingestion branches were removed.

### Next Recommended Step

If you want to fully remove naming remnants, rename `agentmail-inbox-sample.json` and `kinloop_agentmail` fixture labels to neutral synthetic-source identifiers in one final compatibility pass.
