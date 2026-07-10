import { expect, test } from "@playwright/test";

import { expectE2eStackAvailable } from "./local-stack";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("anonymous visitors can browse the canonical schedule", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Fantasy\/Sci-Fi TV Show Start Dates/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Now Showing/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Upcoming/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Awaiting Renewal or Cancellation/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Finished/ })).toBeVisible();
  await expect(page.getByLabel("Search")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Rows" })).toHaveValue("50");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: /Show details for/ }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Sort by When/ })).toHaveAttribute("aria-sort", "ascending");

  const avatar = page.getByRole("row").filter({ hasText: "Avatar: The Last Airbender" });
  await expect(avatar.getByRole("link", { name: "Netflix", exact: true })).toHaveAttribute("href", /netflix\.com/);

  const waitingTab = page.getByRole("tab", { name: /Awaiting Renewal or Cancellation/ });
  await waitingTab.click();
  await expect(waitingTab).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: /Finished/ }).click();
  await expect(page.getByRole("columnheader", { name: /Sort by When/ })).toHaveAttribute("aria-sort", "descending");
  await page.getByRole("button", { name: /Sort by Show/ }).click();
  await expect(page.getByRole("columnheader", { name: /Sort by Show/ })).toHaveAttribute("aria-sort", "ascending");
  await page.getByRole("button", { name: /Sort by Show/ }).click();
  await expect(page.getByRole("columnheader", { name: /Sort by Show/ })).toHaveAttribute("aria-sort", "descending");
});

test("anonymous schedule preferences stay browser-local", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Search").fill("star");
  await page.getByRole("combobox", { name: "Rows" }).click();
  await page.getByRole("option", { name: "20" }).click();
  await expect(page.getByRole("combobox", { name: "Rows" })).toHaveValue("20");

  await page.reload();

  await expect(page.getByLabel("Search")).toHaveValue("star");
  await expect(page.getByRole("combobox", { name: "Rows" })).toHaveValue("20");
});
