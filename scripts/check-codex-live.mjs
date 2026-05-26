import sourceBundle from "../data/kinloop/synthetic-source-sample.json" with { type: "json" };
import { generateGiftSource } from "../lib/codex/gift-source.js";

const hasCredential = Boolean(
  process.env.CODEX_USE_CLI_AUTH === "1" ||
  process.env.CODEX_API_KEY ||
  process.env.OPENAI_API_KEY
);
const defaultPersonId = sourceBundle.latestImport?.signal?.personId || sourceBundle.friends?.[0]?.personId || "sarah";
const defaultPersonName = sourceBundle.friends?.find((friend) => friend.personId === defaultPersonId)?.displayName || "Recipient";

if (!hasCredential) {
  console.error("Codex live check requires CODEX_USE_CLI_AUTH=1, CODEX_API_KEY, or OPENAI_API_KEY.");
  process.exit(1);
}

const result = await generateGiftSource({
  input: sourceBundle.latestImport?.sourceText || `${defaultPersonName} likes pottery, espresso, hosting, and creative workshops.`,
  personId: defaultPersonId,
  sourceSignal: sourceBundle.latestImport || null,
  preferLive: true
});

if (result.mode !== "codex_structured_transform") {
  console.error(`Codex live check fell back: ${result.fallbackReason || result.mode}`);
  process.exit(1);
}

if (!Array.isArray(result.options) || result.options.length !== 3) {
  console.error("Codex live check did not return three gift options.");
  process.exit(1);
}

const invalid = result.options.find((option, index) => {
  return !option.productId || option.rank !== index + 1 || !option.title || !option.why;
});

if (invalid) {
  console.error("Codex live check returned an invalid option shape.");
  process.exit(1);
}

console.log("Codex live check passed.");
console.log(`mode=${result.mode}`);
console.log(`productSource=${result.productSource || result.source}`);
console.log(`options=${result.options.map((option) => option.productId).join(", ")}`);
