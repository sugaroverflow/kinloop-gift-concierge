# Sample AgentMail Inbox Emails

Paste-ready conversation samples for `kinloop-agent@agentmail.to`.

Your compose identity: **sugaroverflow@gmail.com**

The `outbox/` folder contains synthetic messages that are safe to commit and useful for source-bundle development.

## How to send

1. Open Gmail → **Compose**.
2. **To:** `kinloop-agent@agentmail.to`
3. Copy **Subject** and **Body** from each `.txt` file (below the `---` line).
4. Send.

Kinloop imports the **latest** inbox message only. Send everything else first, then send Elara's pottery thread last before clicking **Import latest hint** in the app.

## Friends (5)

| Person | Relation | Gmail address |
|---|---|---|
| Elara Moonwell | Close friend | elara.moonwell@gmail.com |
| Torin Oakenspire | Colleague | torin.oakenspire@gmail.com |
| Lyra Starweave | Sister | lyra.starweave@gmail.com |
| Celeste Fernwick | Mentor | celeste.fernwick@gmail.com |
| Rowan Ashvale | Friend / activist | rowan.ashvale@gmail.com |

## File types

- **`*.thread.txt`** — one email with the full Gmail-style quoted chain (paste once).
- **`*.msgN.txt`** — one message in a longer thread (paste and send in order: msg1 → msg2 → msg3).

## Suggested send order

Send in any order for realism, except keep **Elara → pottery studio** for last:

1. Everyone else's threads (any order).
2. Elara's other four threads.
3. **`elara-moonwell/03-pottery-studio-open-house.msg3.txt`** — best demo signal for Kinloop import.

## Elara demo signals (embedded naturally)

The pottery thread mentions a wheel-throwing class, espresso at her place, hosting friends, and a casual budget range ($40-75). No subject line says "gift hint."

## JSON fixture

After sending (or without sending), Kinloop-shaped import JSON lives at [`data/kinloop/agentmail-inbox-sample.json`](../data/kinloop/agentmail-inbox-sample.json). Regenerate from these plaintext files with:

```txt
node scripts/build-agentmail-sample-fixture.mjs
```
