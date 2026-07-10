import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import {
  buildScheduleFromRegistrySeed,
  defaultScheduleSortDirection,
  defaultScheduleViewPreferences,
  filterScheduleEntries,
  findOrganizationLink,
  scheduleFilterOptions,
  sectionLabels,
  type CanonicalRegistrySeed,
  type ScheduleEntry,
  type ScheduleSection,
} from "../../apps/genretv/src/domain/schedule";
import { expectE2eStackAvailable } from "./local-stack";

test.beforeAll(async () => {
  await expectE2eStackAvailable();
});

test("anonymous visitors can browse the canonical schedule", async ({ page }) => {
  const schedule = buildScheduleFromRegistrySeed(canonicalSeed, { asOf: currentLocalDateKey() });
  const currentEntries = schedule.entries.filter((entry) => entry.section === "current");
  const currentOptions = scheduleFilterOptions(currentEntries);
  const upcomingOptions = scheduleFilterOptions(schedule.entries.filter((entry) => entry.section === "upcoming"));
  const interactiveEntry = findInteractiveEntry(schedule.entries);
  const interactiveOrganization = findLinkedOrganization(interactiveEntry);
  if (interactiveOrganization == null) throw new Error("Expected the selected schedule row to have an official link");
  const interactiveGenre = interactiveEntry.genres[0]!;

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Fantasy\/Sci-Fi TV Show Start Dates/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Now Showing/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Upcoming/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Awaiting Renewal or Cancellation/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Finished/ })).toBeVisible();
  await expect(page.getByLabel("Search")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Rows" })).toHaveValue("50");
  await expect(page.getByRole("button", { name: "Genre: All" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Country:/ })).toHaveCount(0);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: /Show details for/ }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Sort by When/ })).toHaveAttribute("aria-sort", "ascending");

  await page.getByRole("button", { name: "Language: All" }).click();
  await expectCheckboxOptions(page, currentOptions.languages);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Genre: All" }).click();
  await expectCheckboxOptions(page, currentOptions.genres);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: /Upcoming/ }).click();
  await page.getByRole("button", { name: "Genre: All" }).click();
  await expectCheckboxOptions(page, upcomingOptions.genres);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: sectionLabels[interactiveEntry.section] }).click();

  const interactiveRow = page.getByRole("row").filter({ hasText: interactiveEntry.title }).first();
  await expect(interactiveRow.getByRole("link", { name: interactiveOrganization.name, exact: true })).toHaveAttribute(
    "href",
    interactiveOrganization.url,
  );
  await interactiveRow.getByRole("button", { name: interactiveGenre, exact: true }).click();
  await expect(page.getByRole("button", { name: "Genre: 1" })).toBeVisible();
  await expect(interactiveRow).toBeVisible();

  await page.getByRole("button", { name: "Genre: 1" }).click();
  const clearGenre = page.getByRole("button", { name: "Clear", exact: true });
  await expect(clearGenre).toBeVisible();
  await expect(clearGenre).toHaveCSS("color", "rgb(7, 91, 100)");
  await clearGenre.click();
  await expect(page.getByRole("button", { name: "Genre: All" })).toBeVisible();

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

async function expectCheckboxOptions(page: Page, expectedOptions: readonly string[]): Promise<void> {
  const checkboxes = page.getByRole("checkbox");
  await expect(checkboxes).toHaveCount(expectedOptions.length);
  for (const option of expectedOptions) {
    await expect(page.getByRole("checkbox", { name: option, exact: true })).toBeVisible();
  }
}

function findInteractiveEntry(entries: readonly ScheduleEntry[]): ScheduleEntry {
  for (const section of ["current", "upcoming", "waiting", "past"] satisfies ScheduleSection[]) {
    const firstPage = filterScheduleEntries(entries, {
      ...defaultScheduleViewPreferences,
      section,
      sortDirection: defaultScheduleSortDirection(defaultScheduleViewPreferences.sort, section),
    }).slice(0, defaultScheduleViewPreferences.pageSize);
    const entry = firstPage.find(
      (candidate) => candidate.genres.length > 0 && findLinkedOrganization(candidate) != null,
    );
    if (entry != null) return entry;
  }
  throw new Error("Canonical schedule needs a visible genre-tagged row with an official link");
}

function findLinkedOrganization(entry: ScheduleEntry): { name: string; url: string } | null {
  for (const organization of entry.organizations) {
    const link = findOrganizationLink(organization, entry.seasonLinks, entry.organizations.length);
    if (link != null) return { name: organization, url: link.url };
  }
  return null;
}

function currentLocalDateKey(): string {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

const canonicalSeed = JSON.parse(
  readFileSync(new URL("../../apps/genretv/seeds/canonical-registry.seed.json", import.meta.url), "utf8"),
) as CanonicalRegistrySeed;
