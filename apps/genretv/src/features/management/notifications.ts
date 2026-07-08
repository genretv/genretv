export interface WorkflowNotificationRow {
  id: string;
  relatedCanonicalProposalId: string | null;
  relatedPublishApplicationId: string | null;
  status: string;
}

export function unreadNotificationIdsForPublishApplication(
  rows: readonly WorkflowNotificationRow[],
  applicationId: string,
): string[] {
  return rows
    .filter((row) => row.status !== "read" && row.relatedPublishApplicationId === applicationId)
    .map((row) => row.id);
}

export function unreadNotificationIdsForCanonicalProposal(
  rows: readonly WorkflowNotificationRow[],
  proposalId: string,
): string[] {
  return rows
    .filter((row) => row.status !== "read" && row.relatedCanonicalProposalId === proposalId)
    .map((row) => row.id);
}
