# Five-Minute Recording Script: Kinloop

Split the video into two sections: product first, then how it was built with Codex.

## 0:00-0:25 Hook

Say:

```txt
Kinloop gives an AI agent its own inbox for gift hints. It imports messy relationship context, asks Codex to turn it into structured gift options, and keeps the final approval human.
```

Show:

- Sarah's birthday countdown.
- `kinloop-agent@agentmail.to` as the signal intake point.
- The approval boundary: the app prepares a gift decision; the user approves.

## 0:25-2:35 Product Walkthrough

Show:

1. Open Kinloop.
2. Show Sarah's birthday context, preferences, avoid list, budget, and deadline.
3. Click `Import latest hint`.
4. Show the imported AgentMail subject, sender, extracted gift lead, interests, avoid list, budget, and delivery signal.
5. Click `Run Codex gift scan`.
6. Narrate Codex Signal Studio:
   - signal input
   - runtime trace
   - structured gift options
   - guardrails and human approval
7. Compare the three gift options.
8. Approve one gift.
9. Show the audit trail: signal imported, Codex generated options, gift approved.

Say:

```txt
The important part is not that Codex writes copy. Codex is a bounded runtime capability inside the product, producing structured decision objects from real-world messy input.
```

## 2:35-4:25 How I Built This With Codex

Cover the engineering story:

- Used Codex to narrow the scope into one complete product pipeline.
- Used `@openai/codex-sdk` programmatically in the app.
- Added AgentMail intake so the product can read a real agent-owned inbox.
- Kept deterministic signal normalization around the AI call for reliability.
- Constrained Codex output to structured gift option fields.
- Kept high-impact actions out of scope: no purchase, no payment, no fulfillment, no unattended send.
- Used Supabase for auth and product memory when configured.
- Used tests for parser behavior, API routes, persistence boundaries, UI copy, build, and browser smoke.

Optional line:

```txt
The Codexmaxxing angle is that Codex helped build the app, and Codex is also a constrained runtime transformation layer inside the app.
```

## 4:25-5:00 Truth, Safety, And Scope

Close with:

- Built: working app, login path, AgentMail intake route, Codex Signal Studio, approval flow, tests.
- Demonstrated: real inbox-shaped signal import and structured Codex output inside a commerce workflow.
- Safe by design: human approval, audit trail, no payment, no purchase, no fulfillment.
- Optional next edge: OpenClaw reminder delivery or voice confirmation once the allowlisted channel path is verified.

End on:

```txt
Kinloop shows how Codex can become a product workflow primitive: it turns messy external context into governed, auditable decisions.
```
