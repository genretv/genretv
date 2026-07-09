import { expect, test } from "@playwright/test";

import { expectE2eStackAvailable, localPublisher, signIn } from "./local-stack";

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
  await expect(page.getByText("1 season will be published as a new list.")).toBeVisible();
  await page.getByRole("button", { name: "Publish snapshot" }).click();

  await expect(page.getByText("Published snapshot saved.")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("region", { name: "Published lists" }).getByRole("row").filter({ hasText: slug }))
    .toBeVisible();

  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto("/published");

  const publicList = anonymousPage.getByRole("heading", { name: title });
  await expect(publicList).toBeVisible({ timeout: 120_000 });
  await expect(anonymousPage.getByText(description)).toBeVisible();
  await expect(anonymousPage.getByText("1 rows")).toBeVisible();
  await expect(anonymousPage.getByText("Alien: Earth")).toBeVisible();

  await anonymousPage.getByRole("link", { name: title }).click();
  await expect(anonymousPage).toHaveURL(new RegExp(`/published/${slug}$`));
  await expect(anonymousPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(anonymousPage.getByRole("heading", { name: "Rows" })).toBeVisible();
  await expect(anonymousPage.getByRole("table")).toBeVisible();
  await expect(anonymousPage.getByText("Alien: Earth")).toBeVisible();
  await expect(anonymousPage.getByRole("button", { name: "Link" }).first()).toBeDisabled();
  await expect(anonymousPage.getByRole("button", { name: "Copy" }).first()).toBeDisabled();

  await anonymousContext.close();
});
