# Product Direction And Parallel Build Lanes

## 2026-05-26T00:00:00Z - Product Direction And Parallel Build Lanes

### Goal

Define Kinloop's initial product direction as a dynamic, source-driven gift concierge and explore two implementation lanes in Codex Cloud.

### Changes

- Started two Codex Cloud implementation lanes from the GitHub repository.
- Set a shared product goal for both lanes: source-driven relationship import, discovered gift opportunities, editable essentials, gift idea reveal, approval, and reminder opt-in.
- Kept architecture requirements consistent across lanes while varying product emphasis.

### Decisions

- Kinloop is a consumer gift concierge, not an architecture surface.
- The product is driven by imported relationship/source data.
- The main experience centers on discovered people, birthdays, gift clues, gift ideas, approval, and reminders.
- Codex SDK, Supabase, OpenClaw, and MCP remain implementation layers behind the product surface.
- Lane A prioritizes reliability, clean UX, tight scope, maintainable architecture, and passing tests.
- Lane B prioritizes anime command pop visual ambition, generated/static assets, and a stronger gift reveal while preserving the same architecture requirements.

### Tradeoffs

- Iteration 1 uses source-bundle import instead of direct Gmail, iMessage, Facebook, contacts, or calendar OAuth.
- Product UI does not advertise architecture systems, even though those systems are important to the implementation story.
- Gift approval remains separate from purchase, payment, checkout, and fulfillment.

### Risks

- Visual ambition must not compromise usability or testability.
- Source extraction must feel dynamic without relying on unsafe private data.
- Real OpenClaw calls require explicit credentials and allowlisted targets.
- The final branch selection must preserve a coherent product direction instead of merging incompatible ideas.

### Verification

Each Codex Cloud lane should run:

```txt
scripts/container-run.sh npm run check
scripts/container-run.sh npm run check:browser
```

The selected lane should also pass UI copy checks that keep architecture-console terms out of the main product surface.

### Demo Impact

The product recording can stay user-focused: import source data, reveal gift ideas, approve one, and enable reminders. The technical walkthrough can separately explain Codex SDK extraction, Supabase persistence, OpenClaw reminder calling, MCP context, and Codex Cloud parallel build lanes.

### Customer-Facing Context

Kinloop is designed as a bounded gift concierge. It turns relationship context into useful gift opportunities while keeping approval and reminder preferences under user control.

### Next Recommended Step

Completed in [2026-05-26-codex-cloud-lane-review.md](2026-05-26-codex-cloud-lane-review.md): both Cloud lanes were reviewed, closed without merge, and the stronger product direction was consolidated locally on `main`.
