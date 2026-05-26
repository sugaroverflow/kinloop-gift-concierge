# UI Architecture

Product route, copy, and state guidance for Kinloop. Architecture decisions live in `docs/architecture.md`.

## Product Goal

Make Kinloop feel like an agentic gift approval cockpit, not a marketplace clone or admin console.

```txt
Sarah's birthday is close. Kinloop has a signal. Codex turns it into gift options. The human approves.
```

## Experience Model

The app should present one primary workflow:

1. Sarah's birthday context and countdown.
2. AgentMail signal import.
3. Extracted relationship context.
4. Codex Signal Studio transformation.
5. Three approval-ready gift options.
6. Human approval and audit trail.

## Copy Rules

Do not use internal implementation labels in the product UI. Product copy should sound like a real customer-facing application, not a build artifact or testing harness.

Use product language:

- `Import latest hint`
- `Relationship signal`
- `Run Codex gift scan`
- `Why it fits`
- `Watch-outs`
- `Approve gift`
- `Approved`
- `Audit trail`
- `Account`

Truth labels belong in docs, tests, and operator surfaces.

## Screen Model

| Surface | Purpose | Primary state |
|---|---|---|
| Header | Product identity, account state, approval state | Signed-in user or local session |
| Sarah panel | Countdown, relationship, preferences, constraints | Recipient profile |
| Agent inbox panel | Import and summarize the latest AgentMail hint | Signal loading, error, imported signal |
| Codex Signal Studio | Show transformation trace and structured output | Idle, running, complete, error |
| Gift options | Compare three generated options | Option list and selected approval |
| Audit trail | Explain what happened | Signal imported, Codex ran, gift approved |

## Product State

The main app state should stay small:

```js
{
  session,
  recipient,
  signal,
  codexRun,
  giftOptions,
  approval,
  auditEvents
}
```

Avoid product state for baskets, merchant handoffs, broad saved lists, marketplace search, or simulated purchases.

## Visual Direction

- Dense, polished cockpit layout.
- Warm human context balanced with technical clarity.
- Anime-style committed portraits and gift imagery.
- No stock-photo dependency in the final recording path.
- No ecommerce-cart visual language.
- No nested card stacks.
- Stable controls that do not resize during import/generation.

## Interaction Rules

### Sarah Context

Make Sarah's birthday the emotional anchor. Show timing, likes, avoid list, budget, and deadline.

### Agent Inbox

The import button should clearly read from `kinloop-agent@agentmail.to`. Missing credentials should fail closed with a short connection message.

### Codex Signal Studio

The user should see that Codex is doing structured transformation work, but the UI should stay product-facing. Show trace steps such as:

- Normalize signal
- Load Sarah context
- Generate options
- Apply guardrails
- Prepare approval

### Gift Options

Each option should show:

- image
- title
- price range
- delivery confidence
- why it fits
- watch-outs
- fit score
- approval button

### Audit Trail

Keep it compact and useful:

- signal imported
- options generated
- gift approved

Do not expose raw prompts, secrets, stack traces, or low-level provider logs.

## Quality Bar

- The first viewport should communicate the whole app idea.
- The primary action should be obvious.
- The app should feel real even when a live integration is unavailable.
- Safety should be expressed through control, auditability, and approval.
- Internal architecture labels stay out of the product surface unless they are the intended technical wow moment, such as `Codex Signal Studio`.
