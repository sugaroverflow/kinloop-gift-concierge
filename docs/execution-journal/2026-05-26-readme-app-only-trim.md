## 2026-05-26T22:16:00Z - README App-Only Trim

### Goal

Trim `README.md` so it reflects shipped app behavior and remove non-essential framing.

### Changes

- Tightened the opening description to app-shipped behavior.
- Removed evaluator-oriented language from the users section.
- Simplified product principles to concise app-facing statements.
- Updated product flow to match current synthetic input path.
- Clarified source section to treat `data/kinloop/agentmail-inbox-sample.json` as the default path.
- Renamed "Useful checks" to "Optional integration checks" for clearer expectation setting.
- Replaced build-narrative capability row with shipped reminder-channel behavior.

### Decisions

- Keep README focused on what users/developers can run now.
- Keep future-facing and research-oriented material in `docs/future-considerations.md`.

### Tradeoffs

- Less narrative context in README in exchange for lower ambiguity and faster onboarding.

### Risks

- Some implementation context now lives only in deeper docs.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run check:docs
```

Result:

- Docs check passed (`8 files` required by docs guard).

### Demo Impact

No runtime behavior changed; only documentation scope and wording changed.

### Customer-Facing Context

The main entry doc now communicates a clearer shipped scope and avoids implying non-app behavior.

### Next Recommended Step

If desired, run a parallel trim pass on `docs/architecture.md` and `docs/ui-architecture.md` to ensure wording stays aligned with the same app-only framing.
