import { expect, test, type Download } from "@playwright/test";

import { expectE2eStackAvailable, signIn } from "./local-stack";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("anonymous visitor can export canonical HTML and canonical-only portable SQL", async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  await page.goto("/export");

  await expect(page.getByRole("heading", { name: "Export", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download canonical database" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Personal HTML" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Local database" })).toHaveCount(0);
  await expect(page.getByText("Sign in to export your resolved Personal List")).toBeVisible();

  const canonicalButton = page.getByRole("button", { name: "Download canonical HTML" });
  await expect(canonicalButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await canonicalButton.click();
  const download = await downloadPromise;
  const html = await downloadText(download);

  expect(download.suggestedFilename()).toMatch(/^genretv-canonical-\d{4}-\d{2}-\d{2}\.html$/);
  expectHtmlScheduleFragment(html);
  expect(html).toContain("imdb.com/title/");

  const databaseDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download canonical database" }).click();
  const databaseDownload = await databaseDownloadPromise;
  const sql = await downloadText(databaseDownload);

  expect(databaseDownload.suggestedFilename()).toMatch(/^genretv-canonical-\d{4}-\d{2}-\d{2}\.sql$/);
  expect(sql).toContain("canonical_show");
  expect(sql).toContain("canonical_season");
  expect(sql).toContain("canonical_episode");
  expect(sql).not.toContain("personal_show");
  expect(sql).not.toContain("published_show");
  expect(sql).not.toContain("_read_model");
  expect(sql).not.toContain("_mutations");
  expect(sql).not.toMatch(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i);
  expect(sql).not.toMatch(/CREATE\s+TRIGGER/i);

  const repeatedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download canonical database" }).click();
  const repeatedDownload = await repeatedDownloadPromise;
  expect(repeatedDownload.suggestedFilename()).toBe(databaseDownload.suggestedFilename());
});

test("signed-in user can export resolved personal HTML and a full local store backup", async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  await signIn(page);
  await page.goto("/export");

  await expect(page.getByRole("heading", { name: "Personal HTML" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local database" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download canonical database" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Download complete local database" })).toBeEnabled();

  const personalButton = page.getByRole("button", { name: "Download my list as HTML" });
  await expect(personalButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await personalButton.click();
  const download = await downloadPromise;
  const html = await downloadText(download);

  expect(download.suggestedFilename()).toMatch(/^genretv-personal-\d{4}-\d{2}-\d{2}\.html$/);
  expectHtmlScheduleFragment(html);

  const databaseDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download complete local database" }).click();
  const databaseDownload = await databaseDownloadPromise;
  const backup = await downloadBuffer(databaseDownload);

  expect(databaseDownload.suggestedFilename()).toMatch(/\.pgdata\.tar(?:\.gz)?$/);
  expect(backup.byteLength).toBeGreaterThan(100_000);
});

async function downloadText(download: Download): Promise<string> {
  return (await downloadBuffer(download)).toString("utf8");
}

async function downloadBuffer(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function expectHtmlScheduleFragment(html: string): void {
  expect(html).toMatch(/^<div>\n<table>/);
  expect(html).toMatch(/<\/table>\n<\/div>$/);
  expect(html.match(/<table>/g)).toHaveLength(4);
  expect(html).toContain("<th>On Now</th>");
  expect(html).toContain("<th>Upcoming</th>");
  expect(html).toContain("<th>Awaiting Renewal or Cancellation</th>");
  expect(html).toContain("<th>Past Shows</th>");
  expect(html).not.toContain("<html");
  expect(html).not.toContain(" class=");
  expect(html).not.toContain(" style=");
}
