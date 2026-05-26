# Kinloop Data

These JSON files are the local product records for the Sarah birthday workflow.

They should stay production-shaped:

- stable ids
- relationship summaries
- evidence labels
- catalog ids/SKUs
- merchant and delivery fields
- avoid-list and privacy boundaries

| File | Purpose |
|---|---|
| [people.json](people.json) | Birthday people, preferences, and source summaries |
| [catalog.json](catalog.json) | Gift catalog SKUs for approval options |
| [agentmail-inbox-sample.json](agentmail-inbox-sample.json) | Sample AgentMail inbox import for testing and OpenClaw agent contract |

They must not include real private messages, real addresses, payment data, customer records, secrets, or API keys.

Regenerate the inbox sample fixture after editing `sample-emails/outbox/`:

```txt
node scripts/build-agentmail-sample-fixture.mjs
```
