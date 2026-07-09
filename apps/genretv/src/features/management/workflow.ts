export interface WorkflowReviewRow {
  status: string;
  updatedAtUs: bigint;
}

export interface WorkflowQueueCounts {
  openApplications: number;
  openProposals: number;
}

export function sortWorkflowReviewRows<T extends WorkflowReviewRow>(rows: readonly T[]): T[] {
  return [...rows].sort(compareWorkflowReviewRows);
}

export function workflowQueueSummary(counts: WorkflowQueueCounts): string {
  const total = counts.openApplications + counts.openProposals;
  if (total === 0) return "No open maintainer work.";
  return [countLabel(counts.openApplications, "application"), countLabel(counts.openProposals, "proposal")]
    .filter((item) => item !== "0 applications" && item !== "0 proposals")
    .join(" and ");
}

export function nextWorkflowReviewLabel(counts: WorkflowQueueCounts): string | null {
  if (counts.openApplications > 0) return "Review publisher applications first.";
  if (counts.openProposals > 0) return "Review canonical proposals next.";
  return null;
}

function compareWorkflowReviewRows(left: WorkflowReviewRow, right: WorkflowReviewRow): number {
  const leftOpen = left.status === "open";
  const rightOpen = right.status === "open";
  if (leftOpen && !rightOpen) return -1;
  if (!leftOpen && rightOpen) return 1;
  return Number(right.updatedAtUs - left.updatedAtUs);
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
