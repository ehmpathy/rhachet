import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BOOT_CACHE_WARM_MS } from './asBootCacheLeadDecision';

/**
 * .what = the age past which a lead record is pruned
 * .why = a record older than the warm window already decides `claim`, the same as an absent one;
 *   twelve warm windows sit far past every bound, so a prune never changes a decision
 */
export const BOOT_CACHE_LEAD_PRUNE_MS = 12 * BOOT_CACHE_WARM_MS;

/**
 * .what = delete each boot lead record whose last write is older than the prune age
 * .why = one record lands per boot hash, and each boot edit mints a new hash; without a prune the
 *   dir grows by one file per render, forever
 * .note = idempotent: an absent dir, or a record a peer pruned first, is a no-op
 */
export const delBootCacheLeadsStale = (input: {
  repoPath: string;
  nowMs: number;
}): { pruned: number } => {
  // an absent dir holds no record to prune
  const leadsDir = join(
    getActorsRootDir({ repoPath: input.repoPath }),
    '.boot.leads',
  );
  if (!existsSync(leadsDir)) return { pruned: 0 };

  // find each record past the prune age; a record a peer removed mid-scan is skipped
  const pathsStale = readdirSync(leadsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(leadsDir, name))
    .filter((path) => {
      const stat = statSync(path, { throwIfNoEntry: false });
      return (
        !!stat &&
        stat.isFile() &&
        input.nowMs - stat.mtimeMs > BOOT_CACHE_LEAD_PRUNE_MS
      );
    });

  // remove each; `force` makes a record a peer pruned first a no-op
  pathsStale.forEach((path) => rmSync(path, { force: true }));
  return { pruned: pathsStale.length };
};
