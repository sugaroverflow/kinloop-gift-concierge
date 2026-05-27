## 2026-05-26T20:05:00Z - App Simplification With Shared Factories

### Goal

Simplify app and API surface before adding new functionality by removing repeated boilerplate.

### Changes

- Added `lib/api/read-json.js` as a shared safe JSON-body parser for route handlers.
- Updated these routes to use the shared helper:
  - `app/api/codex/gift-source/route.js`
  - `app/api/openclaw/reminder/route.js`
  - `app/api/voice/reminder-call/route.js`
- Added `app/create-kinloop-page.jsx` as a shared page factory for route wrappers.
- Replaced repeated one-off route wrappers with shared factory exports:
  - `app/page.jsx`
  - `app/import/page.jsx`
  - `app/people/page.jsx`
  - `app/approved/page.jsx`
  - `app/sign-in/page.jsx`

### Decisions

- Kept `KinloopApp` runtime behavior unchanged while reducing wrapper boilerplate.
- Focused this pass on structural simplification with no feature additions.

### Tradeoffs

- Did not split `kinloop-app.jsx` component tree yet to avoid broad churn in the same pass.
- Kept route-level semantics exactly the same while changing only helper wiring.

### Risks

- Shared helper changes affect multiple routes, so regressions would be cross-cutting if introduced.
- Additional refactors should keep this shared helper narrowly scoped to avoid over-generalization.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run test
scripts/container-run.sh npm run build
scripts/container-run.sh npm run check:docs
```

Results:

- Tests passed (`47/47`).
- Production build passed.
- Docs check passed.

### Demo Impact

No demo-flow changes. The codebase is easier to navigate and reason about during walkthroughs.

### Customer-Facing Context

This cleanup improves maintainability and reduces repeated code without changing safety boundaries, approval ownership, or external-send controls.

### Next Recommended Step

Continue simplification by extracting presentational sections from `app/kinloop-app.jsx` into focused components now that state and route wrappers are cleaner.
