import { readFileSync } from "node:fs";

const appPath = "app/kinloop-app.jsx";
const app = readFileSync(appPath, "utf8");
const renderedStart = app.indexOf("if (view === \"signin\")");
const renderedApp = renderedStart >= 0 ? app.slice(renderedStart) : app;
const lowerApp = renderedApp
  .replaceAll(/\/api\/[a-z0-9/_-]+/gi, "/api/internal")
  .toLowerCase();

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
  "Sign in",
  "Bring in your people",
  "Synthetic data input",
  "You're all set",
  "Go to dashboard",
  "Upcoming",
  "Need a reminder?",
  "Set reminder",
  "Later today",
  "3 days",
  "7 days",
  "Find",
  "Why this fits",
  "Approve this gift",
  "Privacy and controls"
];

const failures = [];

for (const term of bannedAppTerms) {
  if (lowerApp.includes(term)) failures.push(`${appPath} contains internal shopper-facing term: ${term}`);
}

for (const phrase of bannedShopperPhrases) {
  if (lowerApp.includes(phrase)) failures.push(`${appPath} contains banned shopper-copy phrase: ${phrase}`);
}

for (const phrase of requiredAppCopy) {
  if (!renderedApp.includes(phrase)) failures.push(`${appPath} missing expected shopper copy: ${phrase}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("UI copy check passed.");
