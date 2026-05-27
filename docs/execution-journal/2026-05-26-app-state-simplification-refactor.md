## 2026-05-26T20:02:00Z - App State Simplification Refactor

### Goal

Simplify app orchestration by removing duplicated React state in the Kinloop app shell and using one canonical persisted state object.

### Changes

- Refactored `app/kinloop-app.jsx` so source/import/people selection data reads from `state` instead of parallel `useState` values.
- Removed parallel state hooks for:
  - `sourceStatuses`
  - `sourceImport`
  - `importStep`
  - `people`
  - `selectedId`
- Updated state transition handlers (`allowSource`, `scanSources`, `finishImport`, `selectPerson`) to write through `setState(...)`.
- Simplified persistence save effect to persist the canonical `state` object.
- Removed a redundant `sourceImport || state.sourceImport` fallback pattern and unused `priorityPerson` prop pass-through.
- Extended `lib/persistence.js` initial defaults to include:
  - `discoveredPeople`
  - `selectedPersonId`
  - `sourceImport`
  - `sourceStatuses`
  - `importStep`

### Decisions

- Kept behavior and route flow unchanged while reducing duplicated state paths.
- Preserved backward compatibility for existing localStorage payloads by maintaining merge-based hydration.
- Deferred larger component extraction to keep this refactor focused on state model clarity.

### Tradeoffs

- This refactor improves orchestration consistency but keeps the current large single-file UI composition in place.
- Existing OpenClaw test behavior remains environment-sensitive and was not changed in this pass.

### Risks

- Any hidden assumptions about prior parallel state synchronization could surface in edge UI interactions.
- Browser-flow verification remains the best follow-up confidence check for import/select/approve transitions.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run build
```

Result:

- Build passed successfully.

Additional checks:

- IDE lints for edited files passed.
- `npm test` showed one pre-existing environment-sensitive OpenClaw assertion unrelated to this app-state refactor path.

### Demo Impact

The app flow is easier to reason about during demos because the import/selection state now has one source of truth.

### Customer-Facing Context

This improves reliability and maintainability of the product shell while preserving approval boundaries and reminder safety behavior.

### Next Recommended Step

Run browser smoke (`scripts/container-run.sh npm run check:browser`) to validate end-to-end UI transitions, then split `kinloop-app.jsx` into feature components now that state ownership is centralized.
