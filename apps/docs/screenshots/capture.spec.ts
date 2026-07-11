import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { localMaintainer, localPublisher, localUser, signIn } from "../../../tests/e2e/local-stack";

const screenshotDirectory = fileURLToPath(new URL("../public/screenshots", import.meta.url));

test("capture schedule orientation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Fantasy\/Sci-Fi TV Show Start Dates/ })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/schedule.png`, fullPage: false });
});

test("capture personal-list management orientation", async ({ page }) => {
  await signIn(page, localUser);
  await page.goto("/manage");
  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/management.png`, fullPage: false });
});

test("capture publishing orientation", async ({ page }) => {
  await signIn(page, localPublisher);
  await page.goto("/publishing");
  await expect(page.getByRole("heading", { name: "Publish snapshot" })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/publishing.png`, fullPage: false });
});

test("capture maintainer-review orientation", async ({ page }) => {
  await signIn(page, localMaintainer);
  await page.goto("/publishing");
  await expect(page.getByRole("region", { name: "Maintainer review queue" })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/maintainer-review.png`, fullPage: false });
});
