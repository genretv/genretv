export function canSendCanonicalProposal(roles: readonly string[]): boolean {
  return roles.includes("publisher") || roles.includes("canonical_maintainer");
}
