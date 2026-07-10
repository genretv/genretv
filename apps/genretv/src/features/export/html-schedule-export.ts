import {
  defaultScheduleSortDirection,
  defaultScheduleViewPreferences,
  filterScheduleEntries,
  findImdbLink,
  findOrganizationLink,
  formatScheduleSeasonCount,
  formatScheduleStatus,
  type CanonicalSchedule,
  type ScheduleEntry,
  type ScheduleSection,
} from "../../domain/schedule";

const sectionOrder = ["current", "upcoming", "waiting", "past"] as const;

const sectionHeaders: Record<ScheduleSection, readonly [string, string, string, string, string, string]> = {
  current: ["On Now", "Day", "Official Page", "Genre", "S", "Finale"],
  upcoming: ["Upcoming", "When", "Official Page", "Genre", "S", "Finale"],
  waiting: ["Awaiting Renewal or Cancellation", "Status", "Official Page", "Genre", "S", "Last Release"],
  past: ["Past Shows", "Status", "Station", "Genre", "S", "Finale"],
};

export function buildHtmlScheduleExport(schedule: CanonicalSchedule): string {
  const tables = sectionOrder.map((section) => buildSectionTable(schedule.entries, section));
  return ["<div>", ...tables, "</div>"].join("\n");
}

export function downloadHtmlScheduleExport(html: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildSectionTable(entries: readonly ScheduleEntry[], section: ScheduleSection): string {
  const sectionEntries = filterScheduleEntries([...entries], {
    ...defaultScheduleViewPreferences,
    section,
    sort: "when",
    sortDirection: defaultScheduleSortDirection("when", section),
  });
  const headings = sectionHeaders[section].map((heading) => `<th>${escapeHtml(heading)}</th>`).join("");
  const rows = sectionEntries.map((entry) => buildRow(entry)).join("\n");
  return ["<table>", `<thead><tr>${headings}</tr></thead>`, "<tbody>", rows, "</tbody>", "</table>"].join("\n");
}

function buildRow(entry: ScheduleEntry): string {
  const cells = [
    showCell(entry),
    timingOrStatusCell(entry),
    organizationCell(entry),
    textCell(genreWithLanguages(entry)),
    textCell(seasonCount(entry)),
    textCell(finaleOrLatestRelease(entry)),
  ];
  return `<tr>${cells.join("")}</tr>`;
}

function showCell(entry: ScheduleEntry): string {
  const imdb = findImdbLink(entry.showLinks);
  return imdb == null ? textCell(entry.title) : `<td>${anchor(imdb.url, entry.title)}</td>`;
}

function timingOrStatusCell(entry: ScheduleEntry): string {
  if (entry.section === "waiting") return textCell("Awaiting renewal or cancellation");
  if (entry.section === "past") return textCell(formatScheduleStatus(entry.section, entry.endedReason, entry.isFinal));
  if (entry.section === "current") return textCell(timingWithoutFinale(entry.timing));
  return textCell(entry.releaseWindow?.raw || timingWithoutFinale(entry.timing));
}

function organizationCell(entry: ScheduleEntry): string {
  const content = entry.organizations
    .map((organization) => {
      const link = findOrganizationLink(organization, entry.seasonLinks, entry.organizations.length);
      return link == null ? escapeHtml(organization) : anchor(link.url, organization);
    })
    .join("/");
  return `<td>${content || escapeHtml(entry.organizationText)}</td>`;
}

function genreWithLanguages(entry: ScheduleEntry): string {
  const languages = entry.languages;
  if (languages.length === 0 || (languages.length === 1 && languages[0] === "en")) return entry.genreText;
  return `${entry.genreText}${entry.genreText === "" ? "" : " "}(${languages.join(", ")})`;
}

function seasonCount(entry: ScheduleEntry): string {
  const count = formatScheduleSeasonCount(entry);
  const markerText = [entry.timing, entry.releaseWindow?.raw, entry.finaleWindow?.raw].filter(Boolean).join(" ");
  return entry.isFinal && !/\(f\)/i.test(markerText) ? `${count}(f)` : count;
}

function finaleOrLatestRelease(entry: ScheduleEntry): string {
  if (entry.finaleWindow?.raw) return entry.finaleWindow.raw;
  if (entry.section === "waiting" || entry.section === "past") return entry.releaseWindow?.raw ?? "";
  return "";
}

function timingWithoutFinale(timing: string): string {
  return timing.split(/\s+·\s+finale\s+/i)[0] ?? timing;
}

function anchor(url: string, label: string): string {
  const href = safeHref(url);
  return href == null
    ? escapeHtml(label)
    : `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function textCell(value: string): string {
  return `<td>${escapeHtml(value)}</td>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
