# Five-Minute Recording Script: Kinloop

Split the video into two sections: product first, then how it was built with Codex.

## 0:00-0:25 Hook

Say:

```txt
Kinloop is a gift concierge that automates everything except the human decision. It imports relationship context, finds upcoming birthdays, reveals product-feed-backed gift ideas, and lets me approve one before the deadline.
```

Show:

- The Kinloop home screen.
- Connected source import.
- The top-priority birthday.
- The approval and reminder path.

## 0:25-2:35 Product Walkthrough

Show:

1. Open Kinloop.
2. Sign in or point out the current-device fallback.
3. Click `Import connected sources`.
4. Show discovered people and upcoming birthdays.
5. Select Sarah and edit one essential field.
6. Click `Reveal gift ideas`.
7. Compare the three gift ideas.
8. Approve one idea.
9. Enable `Call me 3 days before`.

Say:

```txt
The app surface is intentionally not a demo console. The product is about one clear user job: never miss the moment to choose a thoughtful gift.
```

## 2:35-4:25 How I Built This With Codex

Cover the engineering story:

- Used Codex to narrow the scope into one complete product pipeline.
- Used `@openai/codex-sdk` programmatically in the app.
- Added a source intake path with an agent-owned inbox and a checked-in synthetic bundle for reliable recording.
- Added Shopify UCP Catalog MCP product discovery with a mock retailer feed fallback.
- Kept deterministic normalization around the AI call for reliability.
- Constrained Codex output to structured gift idea fields.
- Kept high-impact actions out of scope: no purchase, no payment, no fulfillment, no unattended send.
- Used Supabase for auth and product memory when configured.
- Used tests for parser behavior, API routes, product source, persistence boundaries, UI copy, build, and browser smoke.

Optional line:

```txt
The Codexmaxxing angle is that Codex helped build the app, and Codex is also a constrained runtime transformation layer inside the app.
```

## 4:25-5:00 Truth, Safety, And Scope

Close with:

- Built: working app, login path, source import, product-backed gift reveal, approval flow, reminder preference, tests.
- Demonstrated: source-derived gift context and structured Codex output inside a commerce-adjacent workflow.
- Safe by design: user approval, no payment, no purchase, no fulfillment.
- Optional next edge: OpenClaw reminder delivery or voice confirmation once the allowlisted channel path is verified.

End on:

```txt
Kinloop shows how Codex can become a product workflow primitive: it turns messy external context into governed, useful decisions.
```
