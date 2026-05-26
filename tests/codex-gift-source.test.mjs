import test from "node:test";
import assert from "node:assert/strict";
import { generateFallbackGiftOptions, generateFallbackGiftSource, generateGiftSource } from "../lib/codex/gift-source.js";
import { POST } from "../app/api/codex/gift-source/route.js";

test("local gift source returns shopper-facing structured candidate", () => {
  const candidate = generateFallbackGiftSource({
    input: "Local pottery studio voucher with flexible Saturday sessions"
  });

  assert.equal(typeof candidate.title, "string");
  assert.equal(candidate.why.includes("Sarah") || candidate.suggestedSearch.includes("Sarah"), true);
  assert.equal(candidate.fitScore >= 1 && candidate.fitScore <= 100, true);
});

test("Codex gift source uses product feed fallback when live Codex is not requested", async () => {
  const result = await generateGiftSource({
    input: "Espresso tasting kit from an independent seller",
    preferLive: false
  });

  assert.equal(result.source, "mock_retailer_feed");
  assert.equal(typeof result.candidate.risk, "string");
  assert.equal(result.options.length, 3);
  assert.equal(result.options[0].title, result.candidate.title);
});

test("local gift source returns three approval-ready options", () => {
  const options = generateFallbackGiftOptions({
    input: "Sarah mentioned pottery, espresso, and hosting. Budget is GBP 40-75."
  });

  assert.equal(options.length, 3);
  assert.equal(options.every((option) => typeof option.why === "string"), true);
  assert.equal(options.every((option) => option.fitScore >= 1 && option.fitScore <= 100), true);
});

test("local gift options do not expose AgentMail metadata as titles", () => {
  const options = generateFallbackGiftOptions({
    input: [
      "Source: kinloop_agentmail",
      "Recipient: sarah",
      "Subject: Sarah birthday idea",
      "- Lead: Sarah mentioned pottery and espresso."
    ].join("\n")
  });

  assert.equal(options[0].title.includes("kinloop_agentmail"), false);
  assert.equal(options[0].title.includes("Source:"), false);
});

test("Codex gift source API route returns the same schema without credentials", async () => {
  const response = await POST(new Request("http://localhost/api/codex/gift-source", {
    method: "POST",
    body: JSON.stringify({
      input: "Hand-thrown serving bowl with gift wrapping",
      preferLive: false
    })
  }));
  const payload = await response.json();

  assert.equal(payload.ok, true);
  assert.equal(payload.source, "mock_retailer_feed");
  assert.equal(typeof payload.candidate.caption, "string");
  assert.equal(typeof payload.candidate.why, "string");
  assert.equal(typeof payload.candidate.risk, "string");
  assert.equal(payload.options.length, 3);
});
