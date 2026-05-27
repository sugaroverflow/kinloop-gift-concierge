# Execution Journal

Build narrative for Kinloop: how the repo was shaped, what shipped, what was de-scoped, and how Codex (CLI, `/goal/`, Cloud) participated.

Entries use a standard template: Goal, Changes, Decisions, Tradeoffs, Risks, Verification, Demo Impact, Customer-Facing Context, Next Recommended Step.

## Build harness (Codex workflow)

| Entry | What it records |
|---|---|
| [2026-05-26-codex-goal-initial-scaffold.md](2026-05-26-codex-goal-initial-scaffold.md) | First Codex `/goal/` scaffold: name, SDK path, OpenClaw push, initial repo shape |
| [2026-05-26-product-direction-and-parallel-build-lanes.md](2026-05-26-product-direction-and-parallel-build-lanes.md) | Product direction and plan to run two Codex Cloud lanes |
| [2026-05-26-codex-cloud-lane-review.md](2026-05-26-codex-cloud-lane-review.md) | Codex Cloud PR review, closure, and lessons folded into local build |
| [2026-05-26-adversarial-refactor-page-split.md](2026-05-26-adversarial-refactor-page-split.md) | Adversarial refactor agent: monolith → route-based app shell |

## Product implementation

| Entry | What it records |
|---|---|
| [2026-05-26-product-surface-rebuild.md](2026-05-26-product-surface-rebuild.md) | Consumer gift concierge UI rebuild |
| [2026-05-26-shopify-catalog-product-source.md](2026-05-26-shopify-catalog-product-source.md) | Shopify UCP Catalog MCP + mock feed product source |
| [2026-05-26-source-and-reminder-integration.md](2026-05-26-source-and-reminder-integration.md) | Source import, gift-source handoff, OpenClaw preview, Discord-only reminder |
| [2026-05-26-dashboard-reminder-flow.md](2026-05-26-dashboard-reminder-flow.md) | Reminder setup split from gift approval |
| [2026-05-26-gift-source-validation-brand.md](2026-05-26-gift-source-validation-brand.md) | Codex copy validation hardening and Kinloop brand mark |
| [2026-05-26-challenge-alignment-implementation.md](2026-05-26-challenge-alignment-implementation.md) | Interview rubric alignment: auth, persistence, source-derived people |
| [2026-05-27-cross-person-signals-fallback-removal.md](2026-05-27-cross-person-signals-fallback-removal.md) | Cross-person signal guard and removal of silent UI fallbacks |

## Cleanup and de-scope

| Entry | What it records |
|---|---|
| [2026-05-26-synthetic-source-only-cleanup.md](2026-05-26-synthetic-source-only-cleanup.md) | Single synthetic fixture path |
| [2026-05-26-production-readiness-leftover-cleanup.md](2026-05-26-production-readiness-leftover-cleanup.md) | Remove placeholder connectors and dead scaffolding |
| [2026-05-26-agentmail-runtime-descope.md](2026-05-26-agentmail-runtime-descope.md) | Remove live AgentMail runtime |
| [2026-05-26-repository-cleanup-refactor.md](2026-05-26-repository-cleanup-refactor.md) | Dead code and broken script cleanup |
| [2026-05-26-app-state-simplification-refactor.md](2026-05-26-app-state-simplification-refactor.md) | Persistence defaults and state shape |
| [2026-05-26-app-simplification-shared-factories.md](2026-05-26-app-simplification-shared-factories.md) | Shared test factories |
| [2026-05-26-test-quality-hardening.md](2026-05-26-test-quality-hardening.md) | Test coverage improvements |
| [2026-05-26-synthetic-naming-normalization.md](2026-05-26-synthetic-naming-normalization.md) | Neutral synthetic naming |
| [2026-05-26-synthetic-test-filename-normalization.md](2026-05-26-synthetic-test-filename-normalization.md) | Test filename normalization |

## Documentation

| Entry | What it records |
|---|---|
| [2026-05-26-product-doc-merge-into-readme.md](2026-05-26-product-doc-merge-into-readme.md) | PRODUCT.md merged into README |
| [2026-05-26-readme-app-only-trim.md](2026-05-26-readme-app-only-trim.md) | README trimmed to app focus |
| [2026-05-26-readme-architecture-refresh.md](2026-05-26-readme-architecture-refresh.md) | README architecture and flow refresh |

## Historical note

Several May 26 cleanup entries were backfilled after commit squashing. Build-harness entries above were added to close gaps between git history and the Codex workflow story told in the demo script.

Older entries may still mention removed paths (AgentMail live, Twilio voice, connector placeholders). Treat those as chronological build history, not current behavior. See `docs/architecture.md` for the shipped runtime.
