import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectE2eStackAvailable, signIn } from "./local-stack";

const showsNavLink = (page: Page) => page.getByRole("banner").getByRole("link", { name: "Shows" });

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("seeded maintainer can sign in and open show management", async ({ page }) => {
  await signIn(page);

  await showsNavLink(page).click();

  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add show" })).toBeVisible();
  await expect(page.getByLabel("Search")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();

  const firstShow = page.locator("tbody").getByRole("button").first();
  const firstShowTitle = await firstShow.innerText();
  await firstShow.click();

  await expect(page).toHaveURL(/\/manage\/show\//);
  await expect(page.getByRole("heading", { name: firstShowTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seasons" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible();
});

test("seeded maintainer can create a personal show in their overlay", async ({ page }) => {
  await signIn(page);

  await showsNavLink(page).click();
  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();

  await page.getByRole("button", { name: "Add show" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/new/);

  const overlayTitle = `E2E Personal Show ${Date.now().toString(36)}`;
  const titleInput = page.getByLabel("Display title");
  await titleInput.fill(overlayTitle);
  await page.getByLabel("Languages").fill("en");
  await page.getByRole("button", { name: "Save to overlay" }).click();

  await expect(page.getByText("Saved to your personal overlay.")).toBeVisible();
  await expect(page).toHaveURL(/\/manage\/show\/(?!new)[0-9a-f-]+/);

  await showsNavLink(page).click();
  await page.getByLabel("Search").fill(overlayTitle);

  await expect(page.locator("tbody").getByRole("button", { name: overlayTitle })).toBeVisible();
});
