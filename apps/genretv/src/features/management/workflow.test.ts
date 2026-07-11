import { describe, expect, test } from "bun:test";

import { nextWorkflowReviewLabel, sortWorkflowReviewRows, workflowQueueSummary } from "./workflow";

describe("management workflow queue helpers", () => {
  test("sorts open review rows before historical rows, newest first within each group", () => {
    const rows = [
      { id: "closed-new", status: "closed", updatedAtUs: 40n },
      { id: "open-old", status: "open", updatedAtUs: 10n },
      { id: "approved", status: "approved", updatedAtUs: 50n },
      { id: "open-new", status: "open", updatedAtUs: 30n },
    ];

    expect(sortWorkflowReviewRows(rows).map((row) => row.id)).toEqual([
      "open-new",
      "open-old",
      "approved",
      "closed-new",
    ]);
  });

  test("summarizes the maintainer queue", () => {
    expect(workflowQueueSummary({ openApplications: 0, openProposals: 0 })).toBe("No open maintainer work.");
    expect(workflowQueueSummary({ openApplications: 1, openProposals: 0 })).toBe("1 application");
    expect(workflowQueueSummary({ openApplications: 2, openProposals: 3 })).toBe("2 applications and 3 proposals");
  });

  test("prioritizes applications before canonical proposals", () => {
    expect(nextWorkflowReviewLabel({ openApplications: 1, openProposals: 4 })).toBe(
      "Review publisher applications first.",
    );
    expect(nextWorkflowReviewLabel({ openApplications: 0, openProposals: 2 })).toBe("Review canonical proposals next.");
    expect(nextWorkflowReviewLabel({ openApplications: 0, openProposals: 0 })).toBeNull();
  });
});
