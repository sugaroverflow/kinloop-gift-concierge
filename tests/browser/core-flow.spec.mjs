import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const screenshotDir = "test-results/browser-smoke";

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test("Kinloop cockpit imports, scans, approves, and records audit activity", async ({ page }) => {
  await page.route("**/api/signals/agentmail", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        signal: {
          id: "agentmail:test-message",
          source: "kinloop_agentmail",
          personId: "sarah",
          receivedAt: "2026-05-26T09:00:00.000Z",
          from: "maya@example.com",
          subject: "Sarah birthday idea",
          text: "Sarah mentioned pottery classes twice, likes espresso at home, and has a birthday on June 2. Keep the gift useful, warm, and under GBP 75.",
          extracted: {
            interests: ["pottery", "espresso"],
            avoid: ["generic mugs"],
            giftLead: "Sarah mentioned pottery classes twice and likes espresso at home.",
            budget: "GBP 75",
            delivery: "before June 2"
          }
        },
        sourceText: [
          "Source: kinloop_agentmail",
          "Recipient: sarah",
          "Subject: Sarah birthday idea",
          "Extracted gift signal:",
          "- Lead: Sarah mentioned pottery classes twice and likes espresso at home.",
          "- Interests: pottery, espresso",
          "- Avoid: generic mugs",
          "- Budget: GBP 75",
          "- Delivery: before June 2"
        ].join("\\n")
      })
    });
  });

  await page.goto("/");

  await expect(page.getByLabel("Kinloop home")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sarah's birthday needs a gift decision." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import latest hint" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate gift options" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What Kinloop changed" })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/cockpit-home.png`, fullPage: true });

  await expect(page.getByRole("button", { name: "Generate gift options" })).toBeDisabled();
  const importButton = page.getByRole("button", { name: "Import latest hint" });
  await expect(importButton).toBeEnabled();
  const hintResponse = page.waitForResponse((response) => response.url().includes("/api/signals/agentmail"));
  await importButton.click();
  await hintResponse;
  await expect(page.getByLabel("Gift hint message")).toContainText("pottery");
  await expect(page.getByRole("button", { name: "Generate gift options" })).toBeEnabled();
  await page.getByRole("button", { name: "Generate gift options" }).click();

  await expect(page.getByText("Gift options generated").first()).toBeVisible();
  await expect(page.getByText("3 options prepared for Sarah.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve gift" }).first()).toBeEnabled();
  await page.screenshot({ path: `${screenshotDir}/codex-scan.png`, fullPage: true });

  await page.getByRole("button", { name: "Approve gift" }).first().click();
  await expect(page.getByRole("button", { name: "Approved" }).first()).toBeVisible();
  await expect(page.getByText("Gift approved").first()).toBeVisible();
  await expect(page.getByText(/approved for Sarah/i).first()).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/approval-audit.png`, fullPage: true });
});
