import { existsSync, readFileSync, readdirSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "DESIGN.md",
  "AGENTS.md",
  "docs/architecture.md",
  "docs/ui-architecture.md",
  "docs/future-considerations.md",
  "docs/container-workflow.md",
  "data/kinloop/README.md"
];

const requiredReadmeReferences = [
  "DESIGN.md",
  "AGENTS.md",
  "docs/architecture.md",
  "docs/ui-architecture.md",
  "docs/future-considerations.md",
  "docs/container-workflow.md",
  "docs/execution-journal/"
];

const forbiddenPatterns = [
  /sk-[A-Za-z0-9_-]+/,
  /service[_-]?role/i,
  /BEGIN PRIVATE KEY/,
  /memory\//i
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

if (!existsSync("docs/execution-journal")) {
  failures.push("Missing required directory: docs/execution-journal");
} else if (readdirSync("docs/execution-journal").filter((name) => name.endsWith(".md")).length === 0) {
  failures.push("docs/execution-journal must contain at least one markdown entry");
}

for (const directory of ["memory", `proto${"type"}`]) {
  if (existsSync(directory)) failures.push("Unexpected legacy support directory");
}

const readme = readFileSync("README.md", "utf8");
for (const reference of requiredReadmeReferences) {
  if (!readme.includes(reference)) failures.push(`README missing reference: ${reference}`);
}

for (const file of requiredFiles.filter((path) => existsSync(path))) {
  const content = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) failures.push(`${file} failed docs pattern ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Docs check passed (${requiredFiles.length} files, execution journal present).`);
