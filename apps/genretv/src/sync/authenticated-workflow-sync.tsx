import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";

const canonicalProposal = genretvSyncRegistry.canonical_proposal.view!;

export function AuthenticatedWorkflowSync({ active }: { active: boolean }) {
  useLiveDrizzleRows((sync) => sync.drizzle.select({ id: canonicalProposal.id }).from(canonicalProposal), [], {
    ready: active,
  });

  return null;
}
