import { readFileSync } from "node:fs";

const app = readFileSync("app/page.jsx", "utf8");
const lc = app.toLowerCase();

const banned = ["agentmail", "codex", "mcp", "openclaw", "sdk", "audit", "signal", "human in the loop", "demo", "fixture"];
const required = ["source", "clue", "people", "birthdays", "gift ideas", "Reveal", "Approve", "reminder", "connected sources"];

const failures = [];
for (const term of banned) if (lc.includes(term)) failures.push(`banned term in app/page.jsx: ${term}`);
for (const term of required) if (!app.includes(term)) failures.push(`missing required product term in app/page.jsx: ${term}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("UI copy guard passed.");
