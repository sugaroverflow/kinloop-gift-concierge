import test from "node:test";
import assert from "node:assert/strict";
import { createSignalFromEmail, formatSignalForCodex } from "../lib/signals/email-signal.js";

test("email signal extraction finds Sarah gift preferences", () => {
  const signal = createSignalFromEmail({
    id: "msg_123",
    from: "maya@example.com",
    subject: "Sarah birthday idea",
    date: "2026-05-20T10:30:00Z",
    snippet: "She would love a pottery workshop.",
    text: "Sarah mentioned a local pottery workshop and handmade serving bowl. Budget is GBP 40-75 and it ships before June 2. Avoid generic mugs."
  });

  assert.equal(signal.source, "kinloop_synthetic_source");
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

  assert.match(sourceText, /Source: kinloop_synthetic_source/);
  assert.match(sourceText, /espresso/);
  assert.match(sourceText, /GBP 58/);
});
