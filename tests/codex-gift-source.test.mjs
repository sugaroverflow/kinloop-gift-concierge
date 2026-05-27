import test from "node:test";
import assert from "node:assert/strict";
import { generateFallbackGiftOptions, generateFallbackGiftSource, generateGiftSource, normalizeGiftSourceRequest } from "../lib/codex/gift-source.js";
import { POST } from "../app/api/codex/gift-source/route.js";

test("local gift source returns shopper-facing structured candidate", () => {
  const candidate = generateFallbackGiftSource({
    input: "Local pottery studio voucher with flexible Saturday sessions"
  });

  assert.equal(typeof candidate.title, "string");
  assert.equal(candidate.why.includes("Elara") || candidate.suggestedSearch.includes("Elara"), true);
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
  assert.equal(result.options[0].rank, 1);
  assert.equal(result.options[0].matchLabel, "Best match");
  assert.equal(typeof result.options[0].productId, "string");
  assert.equal(result.catalog.source, "mock_retailer_feed");
});

test("local gift source returns three approval-ready options", () => {
  const options = generateFallbackGiftOptions({
    input: "Elara mentioned pottery, espresso, and hosting. Budget is GBP 40-75."
  });

  assert.equal(options.length, 3);
  assert.equal(options.every((option) => typeof option.why === "string"), true);
  assert.equal(options.every((option) => option.fitScore >= 1 && option.fitScore <= 100), true);
  assert.deepEqual(options.map((option) => option.matchLabel), ["Best match", "Strong match", "Safe backup"]);
});

test("local gift options do not expose AgentMail metadata as titles", () => {
  const options = generateFallbackGiftOptions({
    input: [
      "Source: kinloop_synthetic_source",
      "Recipient: sarah",
      "Subject: Elara birthday idea",
      "- Lead: Elara mentioned pottery and espresso."
    ].join("\n")
  });

  assert.equal(options[0].title.includes("kinloop_synthetic_source"), false);
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
  assert.equal(payload.mode, "deterministic_fallback");
  assert.equal(payload.catalog.candidateCount > 0, true);
  assert.equal(payload.brief.personId, "sarah");
  assert.equal(typeof payload.candidate.caption, "string");
  assert.equal(typeof payload.candidate.why, "string");
  assert.equal(typeof payload.candidate.risk, "string");
  assert.equal(payload.options.length, 3);
});

test("gift source request normalizes rich source briefs", () => {
  const request = normalizeGiftSourceRequest({
    personId: "mateo",
    brief: {
      name: "Mateo Rivera",
      relationship: "Colleague",
      birthday: "June 19",
      budget: "GBP 25-50",
      clues: ["cycling", "desk coffee"],
      avoid: ["alcohol"]
    },
    sourceSignal: {
      sourceText: "Mateo mentioned a hand grinder and weekend rides.",
      signal: {
        personId: "mateo",
        extracted: {
          interests: ["coffee", "cycling"],
          avoid: ["alcohol"],
          giftLead: "Desk coffee situation is ridiculous."
        }
      }
    }
  });

  assert.equal(request.person.id, "mateo");
  assert.equal(request.brief.relationship, "Colleague");
  assert.equal(request.brief.clues.includes("coffee"), true);
  assert.equal(request.brief.avoid.includes("alcohol"), true);
  assert.equal(request.sourceText.includes("Desk coffee"), true);
});

test("gift source request ignores imported signal when it belongs to another person", async () => {
  const result = await generateGiftSource({
    preferLive: false,
    personId: "amina",
    input: "Name: Celeste Fernwick\nInterests: gardening, tea, journaling",
    brief: {
      personId: "amina",
      clues: ["gardening", "tea", "journaling"],
      avoid: ["scented candles"]
    },
    sourceSignal: {
      sourceText: "Recipient: sarah\n- Interests: pottery, espresso, hosting",
      signal: {
        personId: "sarah",
        extracted: {
          interests: ["pottery", "espresso", "hosting"],
          avoid: ["generic mugs"]
        }
      }
    }
  });

  assert.equal(result.brief.personId, "amina");
  assert.equal(result.brief.clues.includes("espresso"), false);
  assert.equal(result.brief.clues.includes("pottery"), false);
  assert.notEqual(result.options[0].productId, "espresso-kit");
});

test("Codex gift source accepts rich brief and keeps catalog fallback", async () => {
  const result = await generateGiftSource({
    preferLive: false,
    brief: {
      personId: "priya",
      name: "Priya Nandakumar",
      relationship: "Sibling",
      birthday: "July 4",
      budget: "GBP 60-120",
      clues: ["textiles", "design books"],
      avoid: ["kitchen gadgets"],
      sourceText: "Priya prefers objects with a story and handmade textiles."
    }
  });

  assert.equal(result.mode, "deterministic_fallback");
  assert.equal(result.brief.personId, "priya");
  assert.equal(result.catalog.source, "mock_retailer_feed");
  assert.equal(result.options.length, 3);
  assert.equal(result.options.every((option) => option.productId), true);
});
