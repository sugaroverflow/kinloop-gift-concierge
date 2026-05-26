import { expect, test } from "@playwright/test";

test("gift concierge flow: import, edit, reveal, approve, reminder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Import relationship sources and clues" })).toBeVisible();
  await page.getByRole("button", { name: "Use sample source bundle" }).click();
  await expect(page.getByText("people discovered")).toBeVisible();
  await page.getByRole("button", { name: /Sarah Chen/ }).click();
  await page.getByLabel("Budget").fill("GBP 50-90");
  await page.getByRole("button", { name: "Reveal gift ideas" }).click();
  await expect(page.getByRole("button", { name: "Approve" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await page.getByLabel("Call me 3 days before").check();
  await expect(page.getByText("Gift idea approved.")).toBeVisible();
});
