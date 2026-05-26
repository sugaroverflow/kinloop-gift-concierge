import { readFileSync } from "node:fs";

const app = readFileSync("app/page.jsx", "utf8").toLowerCase();

const banned = [
  "agentmail",
  "codex",
  "mcp",
  "openclaw",
  "sdk",
  "audit",
  "signal",
  "human in the loop",
  "demo",
  "fixture"
];

const required = [
  "source",
  "clue",
  "people",
  "birthdays",
  "gift ideas",
  "reveal",
  "approve",
  "reminder",
  "connected sources"
];

const failures = [];
for (const word of banned) if (app.includes(word)) failures.push(`banned main UI term found: ${word}`);
for (const word of required) if (!app.includes(word)) failures.push(`required product term missing: ${word}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("UI copy check passed.");
