import { readFileSync } from "node:fs";

const app = readFileSync("app/page.jsx", "utf8");
const renderedStart = app.indexOf("return (\n    <main");
const renderedApp = app.slice(renderedStart);
const lowerApp = renderedApp.toLowerCase();

const bannedAppTerms = [
  "agentmail",
  "codex",
  "openclaw",
  "mcp",
  "sdk",
  "audit trail",
  "human in the loop",
  "demo",
  "fixture",
  "cockpit"
];

const bannedShopperPhrases = [
  "cart",
  "checkout",
  "no real charge",
  "powered by codex",
  "sync with supabase",
  "test mode",
  "recording mode",
  "local mode"
];

const requiredAppCopy = [
  "Kinloop",
  "Connected sources",
  "Import connected sources",
  "Upcoming birthdays",
  "Gift opportunity",
  "Reveal gift ideas",
  "Why it fits",
  "Approve",
  "Call me 3 days before",
  "Privacy and controls"
];

const failures = [];

for (const term of bannedAppTerms) {
  if (lowerApp.includes(term)) failures.push(`app/page.jsx contains internal shopper-facing term: ${term}`);
}

for (const phrase of bannedShopperPhrases) {
  if (lowerApp.includes(phrase)) failures.push(`app/page.jsx contains banned shopper-copy phrase: ${phrase}`);
}

for (const phrase of requiredAppCopy) {
  if (!renderedApp.includes(phrase)) failures.push(`app/page.jsx missing expected shopper copy: ${phrase}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("UI copy check passed.");
