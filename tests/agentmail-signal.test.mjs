import test from "node:test";
import assert from "node:assert/strict";
import { isAgentMailConfigured } from "../lib/agentmail/inbox.js";
import { createSignalFromEmail, formatSignalForCodex } from "../lib/signals/email-signal.js";
import { POST } from "../app/api/signals/agentmail/route.js";

test("AgentMail config requires an API key and inbox", () => {
  assert.equal(isAgentMailConfigured({ AGENTMAIL_API_KEY: "", AGENTMAIL_INBOX_ID: "kinloop-agent@agentmail.to" }), false);
  assert.equal(isAgentMailConfigured({ AGENTMAIL_API_KEY: "am_test", AGENTMAIL_INBOX_ID: "kinloop-agent@agentmail.to" }), true);
});

test("email signal extraction finds Sarah gift preferences", () => {
  const signal = createSignalFromEmail({
    id: "msg_123",
    from: "maya@example.com",
    subject: "Sarah birthday idea",
    date: "2026-05-20T10:30:00Z",
    snippet: "She would love a pottery workshop.",
    text: "Sarah mentioned a local pottery workshop and handmade serving bowl. Budget is GBP 40-75 and it ships before June 2. Avoid generic mugs."
  });

  assert.equal(signal.source, "kinloop_agentmail");
  assert.equal(signal.personId, "sarah");
  assert.equal(signal.extracted.interests.includes("pottery"), true);
  assert.equal(signal.extracted.interests.includes("creative workshops"), true);
  assert.equal(signal.extracted.avoid.includes("generic mugs"), true);
  assert.equal(signal.extracted.budget, "GBP 40-75");
  assert.equal(signal.extracted.delivery, "ships before June 2");
});

test("email signal formats a Codex-ready source", () => {
  const sourceText = formatSignalForCodex(createSignalFromEmail({
    id: "msg_456",
    from: "omar@example.com",
    subject: "Gift lead",
    date: "2026-05-21T09:00:00Z",
    text: "Found an espresso tasting kit for Sarah around GBP 58."
  }));

  assert.match(sourceText, /Source: kinloop_agentmail/);
  assert.match(sourceText, /espresso/);
  assert.match(sourceText, /GBP 58/);
});

test("AgentMail route fails closed without credentials", async () => {
  const previousApiKey = process.env.AGENTMAIL_API_KEY;
  const previousInboxId = process.env.AGENTMAIL_INBOX_ID;
  delete process.env.AGENTMAIL_API_KEY;
  process.env.AGENTMAIL_INBOX_ID = "kinloop-agent@agentmail.to";

  try {
    const response = await POST();
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /not connected/i);
  } finally {
    if (previousApiKey === undefined) delete process.env.AGENTMAIL_API_KEY;
    else process.env.AGENTMAIL_API_KEY = previousApiKey;

    if (previousInboxId === undefined) delete process.env.AGENTMAIL_INBOX_ID;
    else process.env.AGENTMAIL_INBOX_ID = previousInboxId;
  }
});
