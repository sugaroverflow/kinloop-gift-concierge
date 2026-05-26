# Codex Guidance

Kinloop is a focused implementation repo for a source-driven gift concierge app powered by Codex, Supabase, and a bounded OpenClaw reminder channel.

## Read First

1. `README.md`
2. `DESIGN.md`
3. `docs/architecture.md`
4. `docs/ui-architecture.md`
5. `docs/execution-journal/` for build narrative and agent-harness context
6. `docs/container-workflow.md` before installing packages or running app code

## Implementation Boundaries

- Package installs and app commands run inside Docker through `scripts/container-run.sh` or `scripts/container-shell.sh`.
- Do not install packages on the host.
- Do not commit secrets, private inbox contents, payment credentials, or raw customer data.
- Keep the product path narrow: synthetic source import, Codex transformation, gift approval, reminder preference.
- Keep future-thinking sections clearly marked as non-MVP.

## Architecture Terms

- Use `Kinloop app` for the user-facing product surface.
- Use `synthetic source fixture` for `data/kinloop/synthetic-source-sample.json`.
- Use `Codex gift transformation` for the in-app Codex SDK workflow.
- Use `OpenClaw channel service` for allowlisted messaging, routing, CLI, and voice boundaries.
- Use `Supabase product memory` for durable auth, approval, and audit state.
- Use `Codex build subagents` for implementation and review workflows. They are not runtime product agents.

## Safety Invariants

- No real purchase.
- No auto-purchase.
- No payment processing.
- No fulfillment.
- No real iMessage scraping.
- No continuous inbox indexing.
- Approval creates a gift approval record, not a purchase.
- Supabase owns product approval state when configured.
- OpenClaw can only send through explicit credentials, consent, allowlists, and visible mode labels.

## Review Checkpoints

For implementation phases, use small scoped tasks with:

- acceptance criteria
- stop conditions
- verification commands
- review checkpoints
- rollback notes

Use Codex build subagents for architecture, risk, security/privacy, tests, and UI review. For frontend implementation or review, use the Impeccable skill as the UI quality bar.
