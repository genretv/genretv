import { rm } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";

import { expectE2eStackAvailable, localUser } from "./local-stack";

const scheduleHeading = /Fantasy\/Sci-Fi TV Show Start Dates/;
const existingShowTitle = "Alien: Earth";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("a cold worker paints the persisted canonical schedule before nonessential live queries", async ({
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "The persisted PGlite store uses Chromium's IndexedDB profile.");
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== "string") throw new Error("Warm-store E2E requires a configured baseURL");
  const profilePath = resolve("tmp/agents", `warm-store-profile-${process.pid}-${Date.now().toString(36)}`);
  let firstContext: BrowserContext | null = null;
  let warmContext: BrowserContext | null = null;

  try {
    firstContext = await chromium.launchPersistentContext(profilePath, {
      baseURL,
      headless: true,
      ignoreHTTPSErrors: true,
    });
    const firstPage = firstContext.pages()[0] ?? (await firstContext.newPage());
    await firstPage.goto("/");
    await expectScheduleOrPageError(firstPage);
    await waitForOfflineInstallation(firstPage);
    await firstContext.close();
    firstContext = null;

    warmContext = await chromium.launchPersistentContext(profilePath, {
      baseURL,
      headless: true,
      ignoreHTTPSErrors: true,
    });
    await warmContext.setOffline(true);
    const warmPage = warmContext.pages()[0] ?? (await warmContext.newPage());
    const liveQueryRegistrations: string[] = [];
    warmPage.on("console", (message) => {
      if (message.text().includes("live-query register")) liveQueryRegistrations.push(message.text());
    });
    await installWarmBootObserver(warmPage);

    await warmPage.goto("/", { waitUntil: "domcontentloaded" });
    await expect(warmPage.getByRole("banner")).toBeVisible();
    await expectScheduleOrPageError(warmPage);

    const metrics = await warmPage.evaluate(() => {
      const state = (
        window as typeof window & {
          __genretvWarmBoot?: { falseEmpty: boolean; frameAt: number | null; scheduleAt: number | null };
        }
      ).__genretvWarmBoot;
      if (state == null) throw new Error("Warm-boot observer was not installed");
      return state;
    });
    expect(metrics.falseEmpty).toBe(false);
    expect(metrics.frameAt).not.toBeNull();
    expect(metrics.scheduleAt).not.toBeNull();
    expect(metrics.frameAt!).toBeLessThan(metrics.scheduleAt!);
    expect(liveQueryRegistrations.length).toBeLessThanOrEqual(4);

    await testInfo.attach("warm-store-startup.json", {
      body: JSON.stringify({ ...metrics, liveQueryRegistrations: liveQueryRegistrations.length }, null, 2),
      contentType: "application/json",
    });
  } finally {
    await firstContext?.close();
    await warmContext?.close();
    await rm(profilePath, { recursive: true, force: true });
  }
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

async function expectScheduleOrPageError(page: Page): Promise<void> {
  let rejectPageError: ((error: Error) => void) | undefined;
  const pageError = new Promise<never>((_resolve, reject) => {
    rejectPageError = reject;
  });
  const onPageError = (error: Error) => rejectPageError?.(error);
  page.on("pageerror", onPageError);

  try {
    await Promise.race([expect(page.locator("tr.schedule-entry-row").first()).toBeVisible(), pageError]);
  } finally {
    page.off("pageerror", onPageError);
  }
}

async function installWarmBootObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const inspectedWindow = window as typeof window & {
      __genretvWarmBoot?: { falseEmpty: boolean; frameAt: number | null; scheduleAt: number | null };
    };
    const state = { falseEmpty: false, frameAt: null, scheduleAt: null };
    inspectedWindow.__genretvWarmBoot = state;
    const inspect = () => {
      if (state.frameAt == null && document.querySelector("header") != null) {
        state.frameAt = performance.now();
      }
      if (state.scheduleAt == null && document.querySelector("tr.schedule-entry-row") != null) {
        state.scheduleAt = performance.now();
      }
      const synchronizing = document.body?.textContent?.includes("Synchronizing canonical schedule") ?? false;
      const zeroCountTab = document.querySelector('[role="tab"][aria-label="Now Showing (0)"]') != null;
      if (synchronizing && zeroCountTab) state.falseEmpty = true;
    };
    new MutationObserver(inspect).observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", inspect, { once: true });
  });
}
