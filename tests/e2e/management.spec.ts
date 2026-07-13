import { expect, test } from "@playwright/test";
import type { Browser, BrowserContext, Locator, Page } from "@playwright/test";

import { expectE2eStackAvailable, expectSynchronizationSettled, localPublisher, signIn } from "./local-stack";

const manageNavLink = (page: Page) => page.getByRole("banner").getByRole("link", { name: "Manage" });
const existingShowTitle = "Alien: Earth";
const existingSeasonLabel = "S2";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("seeded maintainer can sign in and open show management", async ({ page }) => {
  await signIn(page);

  await page.evaluate(() => {
    const inspectedWindow = window as typeof window & { __genretvFalseEmptyManagement?: boolean };
    inspectedWindow.__genretvFalseEmptyManagement = false;
    const inspect = () => {
      const showsHeading = Array.from(document.querySelectorAll("h1")).some(
        (heading) => heading.textContent?.trim() === "Shows",
      );
      const falseZero = document.body?.innerText.includes("0 of 0") ?? false;
      if (showsHeading && falseZero) inspectedWindow.__genretvFalseEmptyManagement = true;
    };
    new MutationObserver(inspect).observe(document, { childList: true, subtree: true });
  });

  await manageNavLink(page).click();

  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add show" })).toBeVisible();
  await expect(page.getByLabel("Search")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as typeof window & { __genretvFalseEmptyManagement?: boolean }).__genretvFalseEmptyManagement,
    ),
  ).toBe(false);

  await page.getByLabel("Search").fill(existingShowTitle);
  const firstShowRow = page.getByRole("row", { name: `Edit ${existingShowTitle}` });
  const firstShowTitle = firstShowRow.getByRole("link", { name: existingShowTitle });
  await expect(firstShowTitle).toHaveAttribute("href", /imdb\.com\/title\//);
  await expect(firstShowTitle).toHaveAttribute("target", "_blank");
  await expect(firstShowRow.getByRole("button", { name: `Edit ${existingShowTitle}` })).toBeVisible();
  await firstShowRow.locator("td").nth(1).click();

  await expect(page).toHaveURL(/\/manage\/show\//);
  await expect(page.getByRole("heading", { name: existingShowTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seasons" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible();

  const seasonRow = page.getByRole("row", { name: `Edit ${existingShowTitle} ${existingSeasonLabel}` });
  await expect(
    seasonRow.getByRole("button", { name: `Edit ${existingShowTitle} ${existingSeasonLabel}` }),
  ).toBeVisible();
  await seasonRow.locator("td").nth(1).click();
  await expect(page).toHaveURL(/\/manage\/show\/[0-9a-f-]+\/season\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: `${existingShowTitle} ${existingSeasonLabel}` })).toBeVisible();
});

test("seeded maintainer can create a personal show in their overlay", async ({ page }) => {
  await signIn(page);

  await manageNavLink(page).click();
  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();

  await page.getByRole("button", { name: "Add show" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/new/);

  const overlayTitle = `E2E Personal Show ${Date.now().toString(36)}`;
  const titleInput = page.getByLabel("Display title");
  await titleInput.fill(overlayTitle);
  await page.getByLabel("Languages").fill("en");
  await page.getByRole("button", { name: "Save to overlay" }).click();

  await expect(page).toHaveURL(/\/manage\/show\/(?!new)[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: overlayTitle })).toBeVisible();
  await expectSynchronizationSettled(page);

  await manageNavLink(page).click();
  await page.getByLabel("Search").fill(overlayTitle);

  await expect(page.locator("tbody").getByRole("button", { name: `Edit ${overlayTitle}` })).toBeVisible();
});

test("publisher can send a show proposal for maintainer merge", async ({ browser, page }, testInfo) => {
  testInfo.setTimeout(240_000);

  await signIn(page, localPublisher);

  await manageNavLink(page).click();
  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();

  await page.getByRole("button", { name: "Add show" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/new/);

  const proposalTitle = `E2E Canonical Show ${Date.now().toString(36)}`;
  const proposalNote = `Please merge ${proposalTitle}`;
  await page.getByLabel("Display title").fill(proposalTitle);
  await page.getByLabel("Languages").fill("en");
  await page.getByLabel("Countries").fill("US");
  await page.getByLabel("Genres").fill("Sci-Fi");
  await page.getByLabel("Notes").fill(proposalNote);
  await page.getByRole("button", { name: "Send to canonical" }).click();

  await expect(page.getByText("Proposal saved locally and queued for the canonical maintainers.")).toBeVisible();
  await expectSynchronizationSettled(page);

  const maintainerContext = await browser.newContext();
  const maintainerPage = await maintainerContext.newPage();
  await signIn(maintainerPage);
  await maintainerPage.getByRole("banner").getByRole("link", { name: "Publishing" }).click();

  const notifications = maintainerPage.getByRole("region", { name: "Notifications" });
  await expect(notifications.getByText(`Canonical proposal: ${proposalTitle}`)).toBeVisible();
  await expect(notifications.getByText(proposalNote)).toBeVisible();
  await expect(notifications.getByText(`Target: ${proposalTitle} (open)`)).toBeVisible();
  await notifications.getByRole("button", { name: "Review proposal" }).click();

  const proposalRow = maintainerPage
    .getByRole("region", { name: "Canonical proposals" })
    .getByRole("row")
    .filter({ hasText: proposalTitle });
  await proposalRow.getByText("Review accepted fields").click();
  await proposalRow.getByLabel("Accept notes").uncheck();
  await proposalRow.getByRole("button", { name: "Approve + merge" }).click();
  await maintainerPage.getByRole("button", { name: "Show history" }).click();
  await expect(
    maintainerPage
      .getByRole("region", { name: "Canonical proposals" })
      .getByRole("row")
      .filter({ hasText: proposalTitle })
      .getByText("approved", { exact: true }),
  ).toBeVisible();
  await expect(
    maintainerPage
      .getByRole("region", { name: "Canonical proposals" })
      .getByRole("row")
      .filter({ hasText: proposalTitle })
      .getByText(/^Accepted fields:/),
  ).not.toContainText("notes");
  await expectSynchronizationSettled(maintainerPage);
});

test("publisher can send a season proposal that creates its canonical parent show", async ({
  browser,
  page,
}, testInfo) => {
  testInfo.setTimeout(300_000);

  await signIn(page, localPublisher);

  const suffix = Date.now().toString(36);
  const showTitle = `E2E Canonical Season Parent ${suffix}`;
  const seasonLabel = "S1";
  const proposalTitle = `${showTitle} ${seasonLabel}`;
  const proposalNote = `Please merge season ${suffix}`;

  await createPersonalShow(page, showTitle);
  await openInitialPersonalSeason(page, showTitle, seasonLabel);
  await page.getByLabel("When").fill("2026");
  await page.getByLabel("Episodes").fill("8");
  await page.getByLabel("Organizations").fill("E2E Streamer");
  await page.getByLabel("Notes").fill(proposalNote);
  await page.getByRole("button", { name: "Save to overlay" }).click();
  await expect(page.getByText("Saved locally to your personal overlay.")).toBeVisible();
  await expect(page).toHaveURL(/\/manage\/show\/[0-9a-f-]+\/season\/(?!new)[0-9a-f-]+/);
  await expectSynchronizationSettled(page);

  await page.getByRole("button", { name: "Send to canonical" }).click();
  await expect(page.getByText("Proposal saved locally and queued for the canonical maintainers.")).toBeVisible();
  await expectSynchronizationSettled(page);

  const maintainer = await approveProposalAsMaintainer(browser, proposalTitle, proposalNote);
  await expectCanonicalSeasonVisible(maintainer.page, showTitle, seasonLabel);
  await maintainer.context.close();
});

test("publisher can send an episode proposal that creates canonical show and season parents", async ({
  browser,
  page,
}, testInfo) => {
  testInfo.setTimeout(360_000);

  await signIn(page, localPublisher);

  const suffix = Date.now().toString(36);
  const showTitle = `E2E Canonical Episode Parent ${suffix}`;
  const seasonLabel = "S1";
  const episodeLabel = "E1";
  const episodeTitle = `Episode merge ${suffix}`;
  const proposalTitle = `${showTitle} ${seasonLabel} ${episodeLabel}`;
  const proposalNote = `Please merge episode ${suffix}`;

  await createPersonalShow(page, showTitle);
  await openInitialPersonalSeason(page, showTitle, seasonLabel);
  await page.getByLabel("When").fill("2026");
  await page.getByLabel("Episodes").fill("1");
  await page.getByLabel("Organizations").fill("E2E Streamer");
  await page.getByRole("button", { name: "Save to overlay" }).click();
  await expect(page.getByText("Saved locally to your personal overlay.")).toBeVisible();
  await expect(page).toHaveURL(/\/manage\/show\/[0-9a-f-]+\/season\/(?!new)[0-9a-f-]+/);
  await expectSynchronizationSettled(page);

  await page.getByRole("button", { name: "Add episode" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/[0-9a-f-]+\/season\/[0-9a-f-]+\/episode\/new/);
  await page.getByLabel("Episode").fill(episodeLabel);
  await page.getByLabel("Title").fill(episodeTitle);
  await page.getByLabel("Release date").fill("2026-01-15");
  await page.getByLabel("Notes").fill(proposalNote);
  await page.getByRole("button", { name: "Save to overlay" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/[0-9a-f-]+\/season\/[0-9a-f-]+\/episode\/(?!new)[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: episodeLabel })).toBeVisible();
  await expectSynchronizationSettled(page);

  await page.getByRole("button", { name: "Season" }).click();
  const episodeRow = page.getByRole("row", {
    name: `Edit ${showTitle} ${seasonLabel} ${episodeLabel}`,
  });
  await expect(
    episodeRow.getByRole("button", { name: `Edit ${showTitle} ${seasonLabel} ${episodeLabel}` }),
  ).toBeVisible();
  await episodeRow.locator("td").nth(2).click();
  await expect(page).toHaveURL(/\/manage\/show\/[0-9a-f-]+\/season\/[0-9a-f-]+\/episode\/[0-9a-f-]+/);

  await page.getByRole("button", { name: "Send to canonical" }).click();
  await expect(page.getByText("Proposal saved locally and queued for the canonical maintainers.")).toBeVisible();
  await expectSynchronizationSettled(page);

  const maintainer = await approveProposalAsMaintainer(browser, proposalTitle, proposalNote);
  await expectCanonicalEpisodeVisible(maintainer.page, showTitle, seasonLabel, episodeLabel, episodeTitle);
  await maintainer.context.close();
});

test("publisher can send an existing canonical season update for maintainer merge", async ({
  browser,
  page,
}, testInfo) => {
  testInfo.setTimeout(300_000);

  await signIn(page, localPublisher);
  await openCanonicalSeason(page, existingShowTitle, existingSeasonLabel);

  const suffix = Date.now().toString(36);
  const updatedTiming = `E2E season update ${suffix}`;
  const proposalTitle = `${existingShowTitle} ${existingSeasonLabel}`;
  const proposalNote = `Please update existing season ${suffix}`;

  await page.getByLabel("When").fill(updatedTiming);
  await page.getByLabel("Notes").fill(proposalNote);
  await page.getByRole("button", { name: "Send to canonical" }).click();
  await expect(page.getByText("Proposal saved locally and queued for the canonical maintainers.")).toBeVisible();
  await expectSynchronizationSettled(page);

  const maintainer = await reviewProposalAsMaintainer(browser, proposalTitle, proposalNote, "Approve + merge");
  await openCanonicalSeason(maintainer.page, existingShowTitle, existingSeasonLabel);
  await expect(maintainer.page.getByLabel("When")).toHaveValue(updatedTiming);
  await expect(maintainer.page.getByLabel("Notes")).toHaveValue(proposalNote);
  await maintainer.context.close();
});

test("maintainer can reject and close canonical proposals without merging", async ({ browser, page }, testInfo) => {
  testInfo.setTimeout(300_000);

  await signIn(page, localPublisher);

  const suffix = Date.now().toString(36);
  const rejectedTitle = `E2E Rejected Canonical Show ${suffix}`;
  const rejectedNote = `Reject this proposal ${suffix}`;
  const closedTitle = `E2E Closed Canonical Show ${suffix}`;
  const closedNote = `Close this proposal ${suffix}`;

  await sendNewShowProposal(page, rejectedTitle, rejectedNote);
  await sendNewShowProposal(page, closedTitle, closedNote);

  const rejected = await reviewProposalAsMaintainer(
    browser,
    rejectedTitle,
    rejectedNote,
    "Reject",
    `Rejected during E2E ${suffix}`,
  );
  await expectProposalStatus(rejected.page, rejectedTitle, rejectedNote, "rejected");
  await expect(rejected.page.getByText(`Reviewer note: Rejected during E2E ${suffix}`)).toBeVisible();
  await rejected.context.close();

  const closed = await reviewProposalAsMaintainer(
    browser,
    closedTitle,
    closedNote,
    "Close",
    `Closed during E2E ${suffix}`,
  );
  await expectProposalStatus(closed.page, closedTitle, closedNote, "closed");
  await expect(closed.page.getByText(`Reviewer note: Closed during E2E ${suffix}`)).toBeVisible();

  await manageNavLink(closed.page).click();
  await closed.page.getByLabel("Search").fill(rejectedTitle);
  await expect(closed.page.locator("tbody").getByRole("button", { name: `Edit ${rejectedTitle}` })).toHaveCount(0);
  await closed.page.getByLabel("Search").fill(closedTitle);
  await expect(closed.page.locator("tbody").getByRole("button", { name: `Edit ${closedTitle}` })).toHaveCount(0);
  await closed.context.close();
});

test("maintainer can identify duplicate open target proposals and close one", async ({ browser, page }, testInfo) => {
  testInfo.setTimeout(300_000);

  await signIn(page, localPublisher);
  await openCanonicalSeason(page, existingShowTitle, existingSeasonLabel);

  const suffix = Date.now().toString(36);
  const proposalTitle = `${existingShowTitle} ${existingSeasonLabel}`;
  const firstNote = `Duplicate first proposal ${suffix}`;
  const secondNote = `Duplicate second proposal ${suffix}`;

  await page.getByLabel("When").fill(`E2E duplicate first ${suffix}`);
  await page.getByLabel("Notes").fill(firstNote);
  await page.getByRole("button", { name: "Send to canonical" }).click();
  await expect(page.getByText("Proposal saved locally and queued for the canonical maintainers.")).toBeVisible();
  await expectSynchronizationSettled(page);

  await page.getByLabel("When").fill(`E2E duplicate second ${suffix}`);
  await page.getByLabel("Notes").fill(secondNote);
  await page.getByRole("button", { name: "Send to canonical" }).click();
  await expect(page.getByText("Proposal saved locally and queued for the canonical maintainers.")).toBeVisible();
  await expectSynchronizationSettled(page);

  const context = await browser.newContext();
  const maintainerPage = await context.newPage();
  await signIn(maintainerPage);
  await openProposalReview(maintainerPage);

  const firstRow = canonicalProposalRow(maintainerPage, proposalTitle, firstNote);
  const secondRow = canonicalProposalRow(maintainerPage, proposalTitle, secondNote);
  await expect(firstRow.getByText("Duplicate open target")).toBeVisible();
  await expect(secondRow.getByText("Duplicate open target")).toBeVisible();

  await secondRow.getByLabel("Canonical proposal reviewer note").fill(`Closing duplicate ${suffix}`);
  await secondRow.getByRole("button", { name: "Close" }).click();
  await maintainerPage.getByRole("button", { name: "Show history" }).click();

  await expectProposalStatus(maintainerPage, proposalTitle, secondNote, "closed");
  await expect(
    canonicalProposalRow(maintainerPage, proposalTitle, firstNote).getByText("open", { exact: true }),
  ).toBeVisible();
  await expectSynchronizationSettled(maintainerPage);
  await context.close();
});

async function createPersonalShow(page: Page, showTitle: string): Promise<void> {
  await manageNavLink(page).click();
  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();
  await page.getByRole("button", { name: "Add show" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/new/);
  await page.getByLabel("Display title").fill(showTitle);
  await page.getByLabel("Languages").fill("en");
  await page.getByLabel("Countries").fill("US");
  await page.getByLabel("Genres").fill("Sci-Fi");
  await page.getByRole("button", { name: "Save to overlay" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/(?!new)[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: showTitle })).toBeVisible();
  await expectSynchronizationSettled(page);
}

async function sendNewShowProposal(page: Page, showTitle: string, proposalNote: string): Promise<void> {
  await manageNavLink(page).click();
  await expect(page.getByRole("heading", { name: "Shows" })).toBeVisible();
  await page.getByRole("button", { name: "Add show" }).click();
  await expect(page).toHaveURL(/\/manage\/show\/new/);
  await page.getByLabel("Display title").fill(showTitle);
  await page.getByLabel("Languages").fill("en");
  await page.getByLabel("Countries").fill("US");
  await page.getByLabel("Genres").fill("Sci-Fi");
  await page.getByLabel("Notes").fill(proposalNote);
  await page.getByRole("button", { name: "Send to canonical" }).click();
  await expect(page.getByText("Proposal saved locally and queued for the canonical maintainers.")).toBeVisible();
  await expectSynchronizationSettled(page);
}

async function approveProposalAsMaintainer(
  browser: Browser,
  proposalTitle: string,
  proposalNote: string,
): Promise<{ context: BrowserContext; page: Page }> {
  return reviewProposalAsMaintainer(browser, proposalTitle, proposalNote, "Approve + merge");
}

async function reviewProposalAsMaintainer(
  browser: Browser,
  proposalTitle: string,
  proposalNote: string,
  action: "Approve + merge" | "Reject" | "Close",
  reviewerNote = "",
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page);
  await openProposalReview(page);

  const notifications = page.getByRole("region", { name: "Notifications" });
  await expect(notifications.getByText(`Canonical proposal: ${proposalTitle}`)).toBeVisible();
  await expect(notifications.getByText(proposalNote)).toBeVisible();
  await reviewProposalOnPage(page, proposalTitle, proposalNote, action, reviewerNote);

  return { context, page };
}

async function reviewProposalOnPage(
  page: Page,
  proposalTitle: string,
  proposalNote: string,
  action: "Approve + merge" | "Reject" | "Close",
  reviewerNote = "",
): Promise<void> {
  await openProposalReview(page);
  const proposalRow = canonicalProposalRow(page, proposalTitle, proposalNote);
  if (reviewerNote !== "") {
    await proposalRow.getByLabel("Canonical proposal reviewer note").fill(reviewerNote);
  }
  await proposalRow.getByRole("button", { name: action }).click();
  await page.getByRole("button", { name: "Show history" }).click();
  await expectProposalStatus(page, proposalTitle, proposalNote, proposalStatusForAction(action));
  await expectSynchronizationSettled(page);
}

async function openProposalReview(page: Page): Promise<void> {
  await page.getByRole("banner").getByRole("link", { name: "Publishing" }).click();
  const reviewButton = page.getByRole("button", { name: "Review proposals" });
  if (await reviewButton.isEnabled()) {
    await reviewButton.click();
  }
}

function canonicalProposalRow(page: Page, proposalTitle: string, proposalNote: string): Locator {
  return page
    .getByRole("region", { name: "Canonical proposals" })
    .getByRole("row")
    .filter({ hasText: proposalTitle })
    .filter({ hasText: proposalNote });
}

async function expectProposalStatus(
  page: Page,
  proposalTitle: string,
  proposalNote: string,
  status: "approved" | "closed" | "open" | "rejected",
): Promise<void> {
  await expect(
    canonicalProposalRow(page, proposalTitle, proposalNote).getByText(status, { exact: true }),
  ).toBeVisible();
}

function proposalStatusForAction(action: "Approve + merge" | "Reject" | "Close"): "approved" | "closed" | "rejected" {
  if (action === "Approve + merge") return "approved";
  if (action === "Reject") return "rejected";
  return "closed";
}

async function openInitialPersonalSeason(page: Page, showTitle: string, seasonLabel: string): Promise<void> {
  await page.getByRole("button", { name: `Edit ${showTitle} ${seasonLabel}` }).click();
  await expect(page).toHaveURL(/\/manage\/show\/[0-9a-f-]+\/season\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: `${showTitle} ${seasonLabel}` })).toBeVisible();
}

async function openCanonicalSeason(page: Page, showTitle: string, seasonLabel: string): Promise<void> {
  await manageNavLink(page).click();
  await page.getByLabel("Search").fill(showTitle);
  await page
    .locator("tbody")
    .getByRole("button", { name: `Edit ${showTitle}` })
    .click();
  await expect(page.getByRole("heading", { name: showTitle })).toBeVisible();
  await page.getByRole("button", { name: `Edit ${showTitle} ${seasonLabel}` }).click();
  await expect(page.getByRole("heading", { name: `${showTitle} ${seasonLabel}` })).toBeVisible();
}

async function expectCanonicalSeasonVisible(page: Page, showTitle: string, seasonLabel: string): Promise<void> {
  await manageNavLink(page).click();
  await page.getByLabel("Search").fill(showTitle);
  await page
    .locator("tbody")
    .getByRole("button", { name: `Edit ${showTitle}` })
    .click();
  await expect(page.getByRole("heading", { name: showTitle })).toBeVisible();
  await expect(page.getByRole("cell", { name: seasonLabel, exact: true })).toBeVisible();
}

async function expectCanonicalEpisodeVisible(
  page: Page,
  showTitle: string,
  seasonLabel: string,
  episodeLabel: string,
  episodeTitle: string,
): Promise<void> {
  await expectCanonicalSeasonVisible(page, showTitle, seasonLabel);
  await page.getByRole("button", { name: `Edit ${showTitle} ${seasonLabel}` }).click();
  await expect(page.getByRole("heading", { name: `${showTitle} ${seasonLabel}` })).toBeVisible();
  await expect(page.getByRole("cell", { name: episodeLabel, exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: episodeTitle, exact: true })).toBeVisible();
}
