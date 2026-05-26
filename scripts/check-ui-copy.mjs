import { readFileSync } from "node:fs";

const files = [
  "app/page.jsx",
  "data/kinloop/people.json",
  "data/kinloop/catalog.json"
];

const bannedPhrases = [
  "cart",
  "no real charge",
  "powered by codex",
  "sync with supabase",
  "test mode",
  "recording mode",
  "local mode"
];

const requiredAppCopy = [
  "Kinloop",
  "AgentMail inbox",
  "Latest gift hint",
  "Gift matching",
  "Generate gift options",
  "Why it fits",
  "Watch-outs",
  "Approve gift",
  "Audit trail",
  "Account"
];

const failures = [];

for (const file of files) {
  const content = readFileSync(file, "utf8").toLowerCase();
  for (const phrase of bannedPhrases) {
    if (content.includes(phrase)) failures.push(`${file} contains banned shopper-copy phrase: ${phrase}`);
  }
}

const app = readFileSync("app/page.jsx", "utf8");
for (const phrase of requiredAppCopy) {
  if (!app.includes(phrase)) failures.push(`app/page.jsx missing expected shopper copy: ${phrase}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("UI copy check passed.");
