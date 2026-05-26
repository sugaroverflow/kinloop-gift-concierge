import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  use: {
    baseURL: "http://localhost:3001"
  },
  webServer: {
    command: "sh -lc 'rm -f .next/dev/lock && npm exec next -- dev -H 0.0.0.0 -p 3001'",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000
  }
});
