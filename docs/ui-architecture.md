# UI Architecture

Product route, copy, and state guidance for Kinloop. Runtime architecture decisions live in `docs/architecture.md`.

## Product Goal

Make Kinloop feel like a consumer gift concierge, not a marketplace clone, admin console, or technical demo panel.

```txt
Sign in. Then either review and approve a gift, or set reminder heartbeat timing from the home dashboard.
```

## Experience Model

The app should present two focused workflows after sign-in:

1. Sign in with the demo account.
2. Run synthetic data input.
3. Watch the import move through input, scanning, and ready states.
4. Land on the upcoming birthday dashboard.
5. Choose either the gift approval path or the reminder path.

Gift approval path:

1. Review a read-only gift brief.
2. Find one recommended gift plus quieter alternatives.
3. Approve one idea in a modal.

Reminder path:

1. Use the home reminder splash to open reminder timing.
2. Choose `Later today`, `3 days`, or `7 days`.
3. Let the heartbeat path trigger Discord when the deadline is near.
4. Treat WhatsApp or a phone call as operator-narrated channel extensions, not product UI defaults.

## Copy Rules

Do not use internal implementation labels in the product UI. Product copy should sound like a real customer-facing application, not a build artifact or testing harness.

Use product language:

- `Sign in`
- `Bring in your people`
- `Synthetic data input`
- `You're all set`
- `Go to dashboard`
- `Upcoming`
- `Need a reminder?`
- `Set reminder`
- `Later today`
- `3 days`
- `7 days`
- `Find [name]'s gift`
- `Why this fits`
- `Approve this gift`
- `Privacy and controls`

Truth labels belong in docs, tests, and operator surfaces.

## Screen Model

| Surface | Purpose | Primary state |
|---|---|---|
| Sign-in screen | Entry and account session start | Email/password sign-in state |
| Source import screen | Run synthetic input, scan, and summarize readiness | Input, scanning, ready |
| Header | Product identity, navigation, account state | Today, People, Approved |
| Reminder splash | Open reminder timing without requiring gift approval | Ready, set, setup attention |
| Reminder modal | Choose heartbeat timing | Later today, 3 days, 7 days |
| Upcoming rail | Navigate discovered people | Imported people, selected person |
| Gift brief | Present the next birthday and source-derived clues | Read-only selected person |
| Recommendation | Present one chosen gift plus alternatives | Loading, ready, approved |
| Approval modal | Confirm gift decision | Open, confirmed |
| Footer | Quiet privacy and boundary copy | Always visible |

## Product State

The main app state should stay small:

```js
{
  session,
  view,
  importStep,
  people,
  selectedPerson,
  giftIdeas,
  approval
}
```

Avoid product state for baskets, merchant handoffs, broad saved lists, marketplace search, or simulated purchases.

## Visual Direction

- Light, crisp, product-native interface.
- Warm relationship context balanced with precise controls.
- A clear first viewport: upcoming people, gift brief, and find-gift path.
- No stock-photo dependency in the main visual identity.
- No ecommerce-cart visual language.
- No nested card stacks.
- Stable controls that do not resize during import/reveal.

## Interaction Rules

### Source Import

Source setup should feel like an onboarding step, not the main dashboard. Synthetic input should stay deterministic and never expose technical errors in shopper-facing copy.

### People And Birthdays

The people rail should make the next birthday obvious, but it should still let the user switch context quickly.

### Gift Reveal

The reveal action should feel like a product action. The implementation may call Codex and product candidates, but the app should simply present useful ideas.

### Gift Ideas

Each option should show:

- title
- price range
- delivery note
- why it fits
- check-first risk
- match label
- approval button

### Reminder

Reminder setup belongs in a separate home dashboard splash, styled like a Kinloop text message. Clicking `Set reminder` should open an inline timing modal with `Later today`, `3 days`, and `7 days`. `Later today` can send immediately for the demo; the other options record heartbeat timing for a later Discord ping. WhatsApp and phone-call extensions can be explained in the demo as channel-routing possibilities outside the primary UI. Live channel delivery remains credentialed and allowlisted.

## Quality Bar

- The first viewport should communicate the whole app idea.
- The primary action should be obvious.
- The app should feel real even when a live integration is unavailable.
- Safety should be expressed through control, approval, and privacy copy.
- Internal architecture labels stay out of the product surface.
