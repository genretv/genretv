export function canSendCanonicalProposal(roles: readonly string[]): boolean {
  return roles.includes("publisher") || roles.includes("canonical_maintainer");
}

export function canPublishList(roles: readonly string[]): boolean {
  return roles.includes("publisher") || roles.includes("canonical_maintainer");
}

export function workflowStatusColor(status: string): string {
  if (status === "approved") return "teal";
  if (status === "rejected") return "red";
  if (status === "closed" || status === "read") return "gray";
  return "yellow";
}
