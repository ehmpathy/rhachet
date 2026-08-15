import { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { getCloneHistoryDir } from './getCloneHistoryDir';
import { getCloneIdentity } from './getCloneIdentity';
import { getOneCloneSlugReconciled } from './getOneCloneSlugReconciled';

/**
 * .what = read one clone dir into a fully-hydrated CloneOndisk — the ONE hydration
 *   seam every clone reader composes
 * .why =
 *   - a CloneOndisk is more than its identity.json: its display slug is reconciled
 *     against the global index, its `actor` ref is derived from its location
 *     under `actor.via.hash=<hash>/`, and its `historyDir` from its dir. if each
 *     reader hand-assembled these, the enrichment would drift caller-to-caller
 *   - one seam means a `list`, a `say`, a `get`, and a `whoami` all see the SAME
 *     hydrated shape — the reconciled slug, the composite actor ref, the history
 *     dir — never a partially-built CloneOndisk
 *
 * .note = null when the dir holds no identity.json (a benign "no clone here" — an
 *   enumerator that races a half-built dir skips it). a CORRUPT record fails loud
 *   inside getCloneIdentity, not here
 */
export const getOneCloneHydrated = (input: {
  cloneDir: string;
  actorsRoot: string;
  repoPath: string;
  actorHash: string;
}): CloneOndisk | null => {
  // read the durable record; an absent one is "no clone here"
  const record = getCloneIdentity({ cloneDir: input.cloneDir });
  if (record === null) return null;

  // reconcile the display slug against the global index (an orphan shows none)
  const slug = getOneCloneSlugReconciled({
    actorsRoot: input.actorsRoot,
    serial: record.serial,
    identitySlug: record.slug,
  });

  return new CloneOndisk({
    serial: record.serial,
    slug,
    actor: { repoPath: input.repoPath, hash: input.actorHash },
    socketEligible: record.socketEligible,
    spawnedAt: record.spawnedAt,
    hostHash: record.hostHash,
    hostPid: record.hostPid,
    hostPidStartedAt: record.hostPidStartedAt,
    historyDir: getCloneHistoryDir({ cloneDir: input.cloneDir }),
  });
};
