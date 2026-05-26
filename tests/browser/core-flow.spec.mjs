import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const screenshotDir = "test-results/browser-smoke";

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test("Kinloop imports sources, reveals gift ideas, approves, and enables reminder", async ({ page }) => {
  await page.route("**/api/gift-source", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        source: "mock_retailer_feed",
        options: [
          {
            id: "studio-class",
            title: "Pottery Studio Voucher",
            caption: "A flexible class pass for a local ceramics studio.",
            why: "Matches pottery clues and avoids shipping pressure.",
            risk: "Confirm the class schedule before approving.",
            priceRange: "GBP 58.00",
            deliveryNote: "Digital delivery today",
            sellerSignal: "Clay North Studio",
            fitScore: 93
          },
          {
            id: "espresso-kit",
            title: "Espresso Tasting Kit",
            caption: "Small-batch beans with tasting notes.",
            why: "Matches espresso and hosting clues.",
            risk: "May overlap with something they already buy.",
            priceRange: "GBP 64.00",
            deliveryNote: "Arrives by May 30",
            sellerSignal: "Tarra Coffee Co.",
            fitScore: 87
          },
          {
            id: "linen-journal",
            title: "Linen Journal Set",
            caption: "Lay-flat notebooks with archival paper.",
            why: "Useful and personal without being extravagant.",
            risk: "Pair it with a handwritten note.",
            priceRange: "GBP 38.00",
            deliveryNote: "Arrives by May 29",
            sellerSignal: "Cedar Paper House",
            fitScore: 81
          }
        ]
      })
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Birthdays, clues, and gift timing in one place." })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/home.png`, fullPage: true });

  await page.getByRole("button", { name: "Import connected sources" }).click();
  await expect(page.getByText("4 people found.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sarah Chen/ })).toBeVisible();

  await page.getByRole("button", { name: /Sarah Chen/ }).click();
  await page.getByLabel("Budget").fill("GBP 50-90");
  await page.getByRole("button", { name: "Reveal gift ideas" }).click();
  await expect(page.getByRole("heading", { name: "Pottery Studio Voucher" })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/ideas.png`, fullPage: true });

  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByRole("button", { name: "Approved" })).toBeVisible();
  await expect(page.getByText("Pottery Studio Voucher approved.")).toBeVisible();

  await page.getByLabel("Call me 3 days before").check();
  await expect(page.getByText("Reminder call enabled.")).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/approved.png`, fullPage: true });
});
