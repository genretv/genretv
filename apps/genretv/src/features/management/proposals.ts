export function canSendCanonicalProposal(roles: readonly string[]): boolean {
  return roles.includes("publisher") || roles.includes("canonical_maintainer");
}

export function canPublishList(roles: readonly string[]): boolean {
  return roles.includes("publisher") || roles.includes("canonical_maintainer");
}

export function hasApprovedPublishApplication(applications: readonly { status: string }[]): boolean {
  return applications.some((application) => application.status === "approved");
}

export function hasOpenPublishApplication(applications: readonly { status: string }[]): boolean {
  return applications.some((application) => application.status === "open");
}

export function canReviewWorkflowStatus(status: string): boolean {
  return status === "open";
}

export function workflowStatusColor(status: string): string {
  if (status === "approved") return "teal";
  if (status === "rejected") return "red";
  if (status === "closed" || status === "read") return "gray";
  return "yellow";
}
