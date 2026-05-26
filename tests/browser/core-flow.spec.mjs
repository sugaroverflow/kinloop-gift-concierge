import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const screenshotDir = "test-results/browser-smoke";

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test("Kinloop follows sign-in, source import, dashboard, approval, and reminder flow", async ({ page }) => {
  let giftSourceRequest = null;
  let reminderCalled = false;

  await page.route("**/api/gift-source", async (route) => {
    giftSourceRequest = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        source: "mock_retailer_feed",
        options: [
          {
            productId: "studio-class",
            rank: 1,
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
            productId: "serving-bowl",
            rank: 2,
            title: "Hand-Thrown Serving Bowl",
            caption: "A glazed serving bowl from an independent ceramicist.",
            why: "Fits ceramics and hosting signals.",
            risk: "Color preference matters.",
            priceRange: "GBP 72.00",
            deliveryNote: "Arrives by May 31",
            sellerSignal: "Moss Kiln",
            fitScore: 87
          },
          {
            productId: "espresso-kit",
            rank: 3,
            title: "Espresso Tasting Kit",
            caption: "Small-batch beans with tasting notes.",
            why: "Matches espresso and hosting clues.",
            risk: "May overlap with something they already buy.",
            priceRange: "GBP 64.00",
            deliveryNote: "Arrives by May 30",
            sellerSignal: "Tarra Coffee Co.",
            fitScore: 81
          }
        ]
      })
    });
  });

  await page.route("**/api/openclaw/reminder", async (route) => {
    reminderCalled = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        mode: "preview",
        target: "kinloop-recipient",
        productSource: "mock_retailer_feed",
        message: { mode: "preview", payload: { recipientName: "Sarah" } },
        voice: null
      })
    });
  });

  await page.goto("/sign-in");
  await page.evaluate(() => window.localStorage.clear());

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/sign-in.png`, fullPage: true });

  await page.getByRole("button", { name: "Continue on this device" }).click();
  await expect(page.getByRole("heading", { name: "Bring in your people" })).toBeVisible();

  await page.getByRole("button", { name: "Synthetic data input" }).click();
  await expect(page.getByText("Building your loop...")).toBeVisible();
  await expect(page.getByRole("heading", { name: "You're all set" })).toBeVisible();
  await expect(page.getByText("Synthetic JSON sample")).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/import-ready.png`, fullPage: true });

  await page.getByRole("button", { name: "Go to dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Sarah Chen" })).toBeVisible();
  await expect(page.getByText("Thoughtful and useful, but not extravagant.")).toBeVisible();

  await page.getByRole("button", { name: "Find Sarah's gift" }).click();
  await expect(page.getByRole("heading", { name: "Pottery Studio Voucher" })).toBeVisible();
  await expect(page.getByText("Best match")).toBeVisible();
  expect(giftSourceRequest?.brief?.personId).toBe("sarah");
  expect(giftSourceRequest?.sourceSignal?.sourceText).toContain("pottery");
  await page.screenshot({ path: `${screenshotDir}/recommendation.png`, fullPage: true });

  await page.getByRole("button", { name: "Approve this gift" }).click();
  const approvalDialog = page.getByRole("dialog", { name: "Pottery Studio Voucher" });
  await expect(approvalDialog.getByRole("heading", { name: "Pottery Studio Voucher" })).toBeVisible();
  await approvalDialog.getByRole("button", { name: "3d before" }).click();
  await approvalDialog.getByRole("button", { name: "Approve gift" }).click();
  await expect(page.getByText("Pottery Studio Voucher approved.")).toBeVisible();
  expect(reminderCalled).toBe(true);

  await page.getByRole("navigation", { name: "Kinloop" }).getByRole("button", { name: "Approved" }).click();
  await expect(page.getByRole("heading", { name: "Gift decisions" })).toBeVisible();
  await expect(page.getByText("Text 3 days before")).toBeVisible();
  await expect(page.getByText("No purchase or payment happens in Kinloop.", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/approved.png`, fullPage: true });
});
