# Codex Guidance

Kinloop is a focused implementation repo for the new product vision: an agentic gift approval cockpit powered by AgentMail, Codex, Supabase, and a bounded OpenClaw channel service.

## Read First

1. `README.md`
2. `PRODUCT.md`
3. `DESIGN.md`
4. `docs/architecture.md`
5. `docs/implementation-plan.md`
6. `docs/ui-architecture.md`
7. `docs/container-workflow.md` before installing packages or running app code

## Implementation Boundaries

- Package installs and app commands run inside Docker through `scripts/container-run.sh` or `scripts/container-shell.sh`.
- Do not install packages on the host.
- Do not commit secrets, private inbox contents, payment credentials, or raw customer data.
- Keep the product path narrow: signal import, Codex transformation, gift approval, audit trail.
- Keep future-thinking sections clearly marked as non-MVP.

## Architecture Terms

- Use `Kinloop cockpit` for the user-facing app surface.
- Use `AgentMail signal inbox` for `kinloop-agent@agentmail.to`.
- Use `Codex Signal Studio` for the in-app Codex SDK transformation workflow.
- Use `OpenClaw channel service` for allowlisted messaging, routing, CLI, and voice boundaries.
- Use `product heartbeat engine` for T-7/T-3/T-1 reminder orchestration.
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
- AgentMail reads are explicit, credentialed, and limited to the configured inbox.
- OpenClaw can only send through explicit credentials, consent, allowlists, and visible mode labels.
- MCP tools can support operator/build context, but they must not own approval state.

## Review Checkpoints

For implementation phases, use small scoped tasks with:

- acceptance criteria
- stop conditions
- verification commands
- review checkpoints
- rollback notes

Use Codex build subagents for architecture, risk, security/privacy, tests, UI, and recording-readiness review. For frontend implementation or review, use the Impeccable skill as the UI quality bar.
