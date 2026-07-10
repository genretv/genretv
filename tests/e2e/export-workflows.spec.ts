import { expect, test, type Download } from "@playwright/test";

import { expectE2eStackAvailable, signIn } from "./local-stack";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("anonymous visitor can export canonical HTML while database export remains disabled", async ({ page }) => {
  await page.goto("/export");

  await expect(page.getByRole("heading", { name: "Export", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Database export unavailable in this build" })).toBeDisabled();
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
});

test("signed-in user can export resolved personal HTML while both database exports remain disabled", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/export");

  await expect(page.getByRole("heading", { name: "Personal HTML" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local database" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Database export unavailable in this build" })).toHaveCount(2);
  for (const button of await page.getByRole("button", { name: "Database export unavailable in this build" }).all()) {
    await expect(button).toBeDisabled();
  }

  const personalButton = page.getByRole("button", { name: "Download my list as HTML" });
  await expect(personalButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await personalButton.click();
  const download = await downloadPromise;
  const html = await downloadText(download);

  expect(download.suggestedFilename()).toMatch(/^genretv-personal-\d{4}-\d{2}-\d{2}\.html$/);
  expectHtmlScheduleFragment(html);
});

async function downloadText(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
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
