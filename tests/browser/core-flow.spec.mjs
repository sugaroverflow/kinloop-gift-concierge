import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const screenshotDir = "test-results/browser-smoke";

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test("source bundle flow imports people, reveals ideas, approves, and sets reminder", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Kinloop" })).toBeVisible();
  await page.getByRole("button", { name: "Import source bundle" }).click();
  await expect(page.getByRole("button", { name: /Maya Chen/ })).toBeVisible();

  await page.getByRole("button", { name: /Maya Chen/ }).click();
  await page.getByRole("button", { name: "Reveal gift ideas" }).click();
  await expect(page.getByRole("button", { name: "Approve" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByRole("button", { name: "Approved" }).first()).toBeVisible();

  await page.getByLabel("Call me 3 days before").check();
  await expect(page.getByLabel("Call me 3 days before")).toBeChecked();

  await page.screenshot({ path: `${screenshotDir}/source-driven-flow.png`, fullPage: true });
});
