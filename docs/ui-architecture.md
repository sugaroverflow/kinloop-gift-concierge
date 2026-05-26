# UI Architecture

Product route, copy, and state guidance for Kinloop. Runtime architecture decisions live in `docs/architecture.md`.

## Product Goal

Make Kinloop feel like a consumer gift concierge, not a marketplace clone, admin console, or technical demo panel.

```txt
Import sources. Find the birthday. Reveal gift ideas. Approve one. Set the reminder.
```

## Experience Model

The app should present one primary workflow:

1. Sign in or continue on the current device.
2. Import connected sources.
3. Review discovered people and upcoming birthdays.
4. Edit essentials: relationship, birthday, budget, address status, and notes.
5. Reveal gift ideas.
6. Approve one idea.
7. Opt into a reminder call.

## Copy Rules

Do not use internal implementation labels in the product UI. Product copy should sound like a real customer-facing application, not a build artifact or testing harness.

Use product language:

- `Connected sources`
- `Import connected sources`
- `Upcoming birthdays`
- `Gift opportunity`
- `Reveal gift ideas`
- `Why it fits`
- `Check first`
- `Approve`
- `Call me 3 days before`
- `Privacy and controls`

Truth labels belong in docs, tests, and operator surfaces.

## Screen Model

| Surface | Purpose | Primary state |
|---|---|---|
| Header | Product identity, account state, progress state | Signed-in user or current device |
| Source panel | Import and summarize relationship context | Idle, importing, imported |
| Priority panel | Show the next birthday that needs attention | Empty or prioritized person |
| People rail | Navigate discovered people | Imported people, selected person |
| Detail panel | Edit essentials and reveal gift ideas | Selected person, loading, error, ready |
| Gift ideas | Compare and approve one idea | Suggested ideas and selected approval |
| Reminder band | Opt into decision reminder | Enabled or paused |
| Footer | Quiet privacy and boundary copy | Always visible |

## Product State

The main app state should stay small:

```js
{
  session,
  people,
  selectedPerson,
  giftIdeas,
  approval,
  reminderEnabled
}
```

Avoid product state for baskets, merchant handoffs, broad saved lists, marketplace search, or simulated purchases.

## Visual Direction

- Light, crisp, product-native interface.
- Warm relationship context balanced with precise controls.
- A clear first viewport: sources, priority, people, and reveal path.
- No stock-photo dependency in the main visual identity.
- No ecommerce-cart visual language.
- No nested card stacks.
- Stable controls that do not resize during import/reveal.

## Interaction Rules

### Source Import

The import button should be clear and consumer-facing. Missing credentials or live integration failure should never expose stack traces in the UI.

### People And Birthdays

The people rail should make the next birthday obvious, but it should still let the user switch context quickly.

### Gift Reveal

The reveal action should feel like a product action. The implementation may call Codex and Shopify-backed product candidates, but the app should simply present useful ideas.

### Gift Ideas

Each option should show:

- title
- price range
- delivery note
- why it fits
- check-first risk
- fit score
- approval button

### Reminder

Reminder opt-in should be explicit. It records preference; live channel delivery remains credentialed and allowlisted.

## Quality Bar

- The first viewport should communicate the whole app idea.
- The primary action should be obvious.
- The app should feel real even when a live integration is unavailable.
- Safety should be expressed through control, approval, and privacy copy.
- Internal architecture labels stay out of the product surface.
