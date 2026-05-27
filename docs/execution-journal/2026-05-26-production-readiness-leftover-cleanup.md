## 2026-05-26T22:22:00Z - Production Readiness Leftover Cleanup

### Goal

Run a repo-wide cleanup pass to remove leftover feature scaffolding and align code, tests, and docs to the shipped synthetic import path.

### Changes

- Simplified `app/kinloop-app.jsx` import flow to synthetic-only:
  - removed placeholder connector scaffolding (`sourceDefinitions`, connect/permission handlers, source cards/modals)
  - removed live AgentMail branch from `importRelationshipSource`
  - kept deterministic synthetic import behavior
- Updated browser smoke test (`tests/browser/core-flow.spec.mjs`) to follow current UI:
  - uses `Synthetic data input`
  - validates synthetic-ready screen
  - aligns approved-page assertion (`Text 3 days before`)
- Updated UI copy guard (`scripts/check-ui-copy.mjs`) to require `Synthetic data input` instead of `Connect with Google`.
- Removed dead/non-product scaffolding:
  - deleted `lib/mcp/context-server.js`
  - deleted `tests/mcp-context.test.mjs`
  - deleted `app/api/heartbeat/run/route.js`
- Aligned canonical docs to the shipped app path:
  - `docs/architecture.md`
  - `docs/ui-architecture.md`
  - `AGENTS.md`
  - `data/kinloop/README.md`

### Decisions

- Treated synthetic fixture import as the sole in-app source path for production readiness.
- Removed non-shipping MCP bridge and unused heartbeat API route to reduce maintenance surface.
- Kept optional operator/live boundaries (`/api/signals/agentmail`, OpenClaw/Twilio live checks) as explicit non-default integrations.

### Tradeoffs

- Dropped placeholder connector UX that previously implied near-term Google/source connectivity.
- Removed MCP context bridge and heartbeat API endpoint that could have supported future operator flows without additional work.

### Risks

- Future reintroduction of connector onboarding or heartbeat API orchestration will require fresh implementation, not revival of placeholders.
- Historical journal entries still reference prior architecture terms; they remain intentionally historical.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run check
scripts/container-run.sh npm run check:browser
```

Results:

- `check` passed (docs, UI copy, unit tests, build)
- Unit/integration tests passed (`44/44`)
- Browser smoke passed (`1/1`)

### Demo Impact

The app now demonstrates a tighter, clearer path: sign in -> synthetic import -> gift reveal -> approval -> reminder boundary, without placeholder source-connection detours.

### Customer-Facing Context

This cleanup improves production posture by reducing dead surface area and ensuring docs/tests reflect only shipped behavior and explicit safety boundaries.

### Next Recommended Step

Decide whether optional live AgentMail route support remains in scope; if not, remove `app/api/signals/agentmail`, `lib/agentmail/*`, and related tests/scripts in a final de-scope pass.
