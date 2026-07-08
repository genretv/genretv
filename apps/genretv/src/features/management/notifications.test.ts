import { describe, expect, test } from "bun:test";

import { unreadNotificationIdsForCanonicalProposal, unreadNotificationIdsForPublishApplication } from "./notifications";

describe("management workflow notifications", () => {
  const rows = [
    {
      id: "application-unread",
      relatedCanonicalProposalId: null,
      relatedPublishApplicationId: "application-1",
      status: "unread",
    },
    {
      id: "application-read",
      relatedCanonicalProposalId: null,
      relatedPublishApplicationId: "application-1",
      status: "read",
    },
    {
      id: "proposal-unread",
      relatedCanonicalProposalId: "proposal-1",
      relatedPublishApplicationId: null,
      status: "unread",
    },
  ];

  test("finds unread notifications for a publish application", () => {
    expect(unreadNotificationIdsForPublishApplication(rows, "application-1")).toEqual(["application-unread"]);
  });

  test("finds unread notifications for a canonical proposal", () => {
    expect(unreadNotificationIdsForCanonicalProposal(rows, "proposal-1")).toEqual(["proposal-unread"]);
  });
});
