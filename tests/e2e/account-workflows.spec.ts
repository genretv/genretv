import { expect, test } from "@playwright/test";

import { expectE2eStackAvailable, localUser, signIn } from "./local-stack";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("signed-in user can save a public profile", async ({ page }) => {
  await signIn(page);

  const displayName = `E2E Maintainer ${Date.now().toString(36)}`;
  const publicSlug = `e2e-maintainer-${Date.now().toString(36)}`;

  await page.getByRole("link", { name: "maintainer@genretv.local" }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Public slug").fill(publicSlug);
  await page.getByLabel("Bio").fill("Profile saved by the isolated E2E stack.");
  await page.getByLabel("Make this profile public").check();
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByText("Profile saved.")).toBeVisible();

  await page.goto(`/profile/${publicSlug}`);
  await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
});

test("non-publisher can apply to publish", async ({ browser, page }) => {
  await signIn(page, localUser);

  await page.getByRole("banner").getByRole("link", { name: "Publishing" }).click();
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();

  const message = `E2E publish application ${Date.now().toString(36)}`;
  await page.getByLabel("Message").fill(message);
  await page.getByRole("button", { name: "Apply to publish" }).click();

  await expect(page.getByText("Application sent.")).toBeVisible();
  await expect(page.getByText(message)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: message }).getByText("open", { exact: true })).toBeVisible();

  const maintainerContext = await browser.newContext();
  const maintainerPage = await maintainerContext.newPage();
  try {
    await signIn(maintainerPage);
    await maintainerPage.getByRole("banner").getByRole("link", { name: "Publishing" }).click();

    const notifications = maintainerPage.getByRole("region", { name: "Notifications" });
    await expect(notifications.getByText("Publisher application")).toBeVisible();
    await expect(notifications.getByText(message)).toBeVisible();
  } finally {
    await maintainerContext.close();
  }
});
