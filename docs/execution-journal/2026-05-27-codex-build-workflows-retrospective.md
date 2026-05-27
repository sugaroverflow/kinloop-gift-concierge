## [2026-05-27T10:36:23Z] - Codex Build Workflows Retrospective

### Goal

Backfill the Codex-specific build history that was not captured clearly enough in earlier journal entries: Codex Cloud exploration, `/goal/` usage, local Codex implementation work, and the boundary between build-time Codex workflows and runtime Codex product behavior.

### Changes

- Documented Codex Cloud as a parallel exploration workflow used to compare product directions before consolidating the app into one focused Kinloop path.
- Documented the completed `/goal/` run for the `/api/gift-source` backend hero.
- Documented local Codex work that continued after the cloud branches: source-derived gift brief wiring, product-source fallback, OpenClaw/Discord reminder boundary, Supabase persistence checks, Vercel deployment, and verification cleanup.
- Clarified that Codex build workflows are implementation/review tools, while runtime Codex behavior lives behind the product API.

### Decisions

- Codex Cloud was treated as a build accelerator for parallel product/design exploration, not as shipped runtime infrastructure.
- The selected product direction was consolidated locally after cloud exploration rather than merging every cloud branch wholesale.
- `/goal/` was used for a narrow backend objective: harden `/api/gift-source` so it accepts rich gift briefs, loads product candidates with fallback, returns three validated options, and has tests/docs coverage.
- A second `/goal/` could not be created in the same thread after the completed gift-source goal remained attached, so later work followed the same checkpoint style manually.
- Runtime Codex stays bounded to structured gift recommendation work. It must not purchase, send messages, scrape broadly, or own product approval state.

### Tradeoffs

- Parallel Codex Cloud branches increased exploration speed but required later consolidation and review to avoid fragmented product direction.
- `/goal/` improved focus for the backend hero but did not replace ordinary verification, docs, or browser smoke tests.
- The app UI intentionally hides Codex, cloud, MCP, OpenClaw, and build-agent language; those details belong in the code walkthrough and journal rather than the customer-facing product.
- Some cloud-generated or exploratory ideas were discarded when they made the product feel like a demo console instead of a gift concierge.

### Risks

- Historical entries may still mention earlier integration paths that were later descoped. Treat newer scoped entries and current tests as the source of active behavior.
- Codex Cloud branch output needs human review before adoption because product taste, safety boundaries, and repo conventions can diverge across parallel attempts.
- `/goal/` completion means the objective was achieved for that scoped backend task; it does not imply the whole submission was complete.

### Verification

Captured from the work history:

- `/goal/` objective completed for `/api/gift-source`; the goal result reported completion with 4,443 tokens used.
- `scripts/container-run.sh npm run check:codex-live` passed with `codex_structured_transform` during live-readiness work.
- Standard verification used throughout consolidation:

```txt
scripts/container-run.sh npm run test
scripts/container-run.sh npm run check
scripts/container-run.sh npm run check:browser
```

The exact active pass/fail state should always be reconfirmed after the latest edits because this entry is retrospective.

### Demo Impact

The video can explain two separate Codex stories:

1. Build-time Codex: Codex Cloud explored parallel versions, `/goal/` focused the backend hero, and local Codex sessions implemented and verified the selected product path.
2. Runtime Codex: the app calls the Codex-powered gift-source route to transform relationship/source context and product candidates into validated gift recommendations.

That separation keeps the product demo user-focused while still proving awareness of advanced Codex workflows.

### Customer-Facing Context

Kinloop uses AI with explicit boundaries. Codex can help build and review the system, and the runtime Codex route can explain gift options, but durable product memory, human approval, and outbound-send controls remain owned by the app architecture.

### Next Recommended Step

Before recording, prepare a short “how I built this” segment that shows:

- the `/api/gift-source` route and schema guardrails
- the product-source fallback path
- the completed `/goal/` objective as a build discipline example
- the Codex Cloud parallel-lane decision as an exploration example
- the verification commands that prove the selected implementation path
