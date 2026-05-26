import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "PRODUCT.md",
  "DESIGN.md",
  "AGENTS.md",
  "docs/architecture.md",
  "docs/implementation-plan.md",
  "docs/ui-architecture.md",
  "docs/future-considerations.md",
  "docs/container-workflow.md",
  "docs/recording-script.md",
  "data/kinloop/README.md"
];

const requiredReadmeReferences = [
  "PRODUCT.md",
  "DESIGN.md",
  "AGENTS.md",
  "docs/architecture.md",
  "docs/implementation-plan.md",
  "docs/ui-architecture.md",
  "docs/future-considerations.md",
  "docs/container-workflow.md",
  "docs/recording-script.md"
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

console.log(`Docs check passed (${requiredFiles.length} files).`);
