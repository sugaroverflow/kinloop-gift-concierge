import test from "node:test";
import assert from "node:assert/strict";
import { createSignalFromEmail, formatSignalForCodex } from "../lib/signals/email-signal.js";
import { derivePeopleFromSyntheticSource, sourceTextForPersonId } from "../lib/source-people.js";

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

test("synthetic source fixture derives dashboard people without people.json", () => {
  const people = derivePeopleFromSyntheticSource();
  const elara = people.find((person) => person.id === "sarah");
  const torin = people.find((person) => person.id === "mateo");
  const lyra = people.find((person) => person.id === "priya");
  const celeste = people.find((person) => person.id === "amina");
  const rowan = people.find((person) => person.id === "rowan");

  assert.equal(people.length >= 5, true);
  assert.equal(elara.name, "Elara Moonwell");
  assert.equal(elara.clues.includes("pottery"), true);
  assert.equal(elara.avoid.includes("generic mugs"), true);
  assert.match(elara.note, /pottery|espresso|hosting/i);
  assert.equal(torin.clues.includes("cycling"), true);
  assert.equal(torin.clues.includes("cookbooks"), true);
  assert.equal(torin.avoid.includes("alcohol"), true);
  assert.equal(torin.clues.includes("pottery"), false);
  assert.equal(lyra.clues.includes("textiles"), true);
  assert.equal(lyra.clues.includes("plants"), true);
  assert.equal(lyra.clues.includes("espresso"), false);
  assert.equal(celeste.clues.includes("gardening"), true);
  assert.equal(celeste.clues.includes("tea"), true);
  assert.equal(celeste.clues.includes("pottery"), false);
  assert.equal(rowan.clues.includes("activism"), true);
  assert.equal(rowan.clues.includes("journalism"), true);
});

test("synthetic source exposes Codex-ready email text per person", () => {
  const sourceText = sourceTextForPersonId("sarah");

  assert.match(sourceText, /Synthetic|Source: kinloop_synthetic_source/i);
  assert.match(sourceText, /pottery|espresso/i);
  assert.doesNotMatch(sourceText, /people\.json/i);
});
