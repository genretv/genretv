import { expect, test } from "@playwright/test";

import {
  expectE2eStackAvailable,
  expectSynchronizationSettled,
  localPublisher,
  localUser,
  signIn,
} from "./local-stack";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("publisher can publish a snapshot that anonymous visitors can inspect", async ({ browser, page }, testInfo) => {
  testInfo.setTimeout(240_000);

  await signIn(page, localPublisher);
  await page.getByRole("banner").getByRole("link", { name: "Publishing" }).click();

  const suffix = Date.now().toString(36);
  const title = `E2E Public List ${suffix}`;
  const slug = `e2e-public-list-${suffix}`;
  const description = `Published for anonymous inspection ${suffix}`;

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Publish filter").fill("Alien: Earth");
  const publicationSummary = page.getByText(/^\d+ seasons? will be published as a new list\.$/);
  await expect(publicationSummary).toBeVisible();
  const publishedSeasonCount = Number.parseInt((await publicationSummary.textContent()) ?? "", 10);
  expect(publishedSeasonCount).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Publish snapshot" }).click();

  await expect(page.getByText("Publication saved locally and queued for synchronization.")).toBeVisible({
    timeout: 120_000,
  });
  await expect(
    page.getByRole("region", { name: "Published lists" }).getByRole("row").filter({ hasText: slug }),
  ).toBeVisible();
  await expectSynchronizationSettled(page);

  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto("/published");

  const publicList = anonymousPage.getByRole("heading", { name: title });
  await expect(publicList).toBeVisible({ timeout: 120_000 });
  await expect(anonymousPage.getByText(description)).toBeVisible();
  await expect(anonymousPage.getByText(`${publishedSeasonCount} rows`)).toBeVisible();
  await expect(anonymousPage.getByText("Alien: Earth")).toHaveCount(publishedSeasonCount);

  await anonymousPage.getByRole("link", { name: title }).click();
  await expect(anonymousPage).toHaveURL(new RegExp(`/published/${slug}$`));
  await expect(anonymousPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(anonymousPage.getByRole("heading", { name: "Rows" })).toBeVisible();
  await expect(anonymousPage.getByRole("table")).toBeVisible();
  await expect(anonymousPage.getByText("Alien: Earth")).toHaveCount(publishedSeasonCount);
  await expect(anonymousPage.getByRole("button", { name: "Link" }).first()).toBeDisabled();
  await expect(anonymousPage.getByRole("button", { name: "Copy" }).first()).toBeDisabled();

  await anonymousContext.close();

  const signedInContext = await browser.newContext();
  const signedInPage = await signedInContext.newPage();
  await signIn(signedInPage, localUser);
  await signedInPage.goto(`/published/${slug}`);

  await expect(signedInPage.getByRole("heading", { name: title })).toBeVisible({ timeout: 120_000 });
  const importedRow = signedInPage.getByRole("row").filter({ hasText: "Alien: Earth" }).first();
  await importedRow.getByRole("button", { name: "Link" }).click();
  await expect(importedRow.getByText("Already linked")).toBeVisible({ timeout: 120_000 });
  await expect(importedRow.getByRole("button", { name: "Copy" })).toHaveCount(0);

  await importedRow.getByRole("button", { name: "Remove link" }).click();
  await expect(importedRow.getByRole("button", { name: "Link" })).toBeVisible({ timeout: 120_000 });
  await expect(importedRow.getByRole("button", { name: "Copy" })).toBeVisible();

  await importedRow.getByRole("button", { name: "Copy" }).click();
  await expect(importedRow.getByText("Copied to your list")).toBeVisible({ timeout: 120_000 });
  await expect(importedRow.getByText("This copy can be edited independently.")).toBeVisible();

  await signedInContext.close();
});
