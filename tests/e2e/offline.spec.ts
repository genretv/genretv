import { expect, test, type Page } from "@playwright/test";

import { expectE2eStackAvailable, localUser } from "./local-stack";

const scheduleHeading = /Fantasy\/Sci-Fi TV Show Start Dates/;
const existingShowTitle = "Alien: Earth";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("installed application reloads the canonical schedule offline", async ({ context, page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: scheduleHeading })).toBeVisible();
  await waitForOfflineInstallation(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: scheduleHeading })).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: scheduleHeading })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Now Showing/ })).toBeVisible();
});

test("visited documentation remains documentation when reopened offline", async ({ context, page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: scheduleHeading })).toBeVisible();
  await waitForOfflineInstallation(page);

  await page.goto("/docs/getting-started/");
  await expect(page.getByRole("heading", { name: "Welcome to GenreTV" })).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Welcome to GenreTV" })).toBeVisible();
  await expect(page.getByRole("heading", { name: scheduleHeading })).toHaveCount(0);
});

test("authenticated optimistic change survives an offline reload and synchronizes on reconnect", async ({
  context,
  page,
}) => {
  await signInForInstalledApp(page);
  await waitForOfflineInstallation(page);
  await page.getByRole("banner").getByRole("link", { name: "Manage" }).click();
  await page.getByLabel("Search").fill(existingShowTitle);
  await page.getByRole("button", { name: `Edit ${existingShowTitle}` }).click();

  const title = `${existingShowTitle} Offline ${Date.now().toString(36)}`;
  await page.getByLabel("Display title").fill(title);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save to overlay" }).click();

  await expect(page.getByText("Saved locally to your personal overlay.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Synchronization:/ })).toContainText(/pending|delayed/i);

  const personalShowId = personalShowIdFromUrl(page.url());
  await page.close();
  const reopenedPage = await context.newPage();
  await reopenedPage.goto(`/#/manage/show/${personalShowId}`, { waitUntil: "domcontentloaded" });
  await expect(reopenedPage.getByRole("heading", { name: title })).toBeVisible();
  await reopenedPage.getByRole("link", { name: /Synchronization:/ }).click();
  await expect(reopenedPage.getByRole("heading", { name: "Synchronization" })).toBeVisible();
  await expect(reopenedPage.getByText("Personal Show")).toBeVisible();

  await context.setOffline(false);
  await expect(reopenedPage.getByRole("link", { name: "Synchronization: Synchronized" })).toBeVisible({
    timeout: 120_000,
  });

  await reopenedPage.getByRole("banner").getByRole("link", { name: "Manage" }).click();
  await reopenedPage.getByLabel("Search").fill(title);
  await expect(reopenedPage.locator("tbody").getByRole("button", { name: `Edit ${title}` })).toBeVisible();
});

function personalShowIdFromUrl(url: string): string {
  const match = url.match(/\/manage\/show\/([0-9a-f-]+)$/);
  if (match?.[1] == null) throw new Error(`Expected a saved personal Show URL, received ${url}`);
  return match[1];
}

async function signInForInstalledApp(page: Page): Promise<void> {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(localUser.email);
  await page.getByRole("textbox", { name: "Password" }).fill(localUser.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(localUser.email)).toBeVisible();
}

async function waitForOfflineInstallation(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("Service workers are unavailable");
    await navigator.serviceWorker.ready;
  });
  const controlled = await page.evaluate(() => navigator.serviceWorker.controller != null);
  if (!controlled) await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller != null);
}
