import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { delFileSync } from '@src/infra/filesystem/delFileSync';

import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getActorOndiskDir } from '../actor/enrolled/getActorOndiskDir';
import { getActorsIndexDir } from '../actor/enrolled/getActorsIndexDir';
import { getCloneDir } from './getCloneDir';
import { getCloneHistoryDir } from './getCloneHistoryDir';
import { getCloneSocketPath } from './getCloneSocketPath';

/**
 * .what = reap one DEAD clone's whole on-disk footprint — its dir, its socket
 *   file, and its global index entries (`.serials/`, `.slugs/`, `.exids/`)
 * .why =
 *   - `rhx clone prune` removes the clones a human no longer needs. unlike
 *     delCloneSpawn (which reaps a LIVE loser via a spawn handle it holds), a pruned
 *     clone has NO live child — it is a set of on-disk artifacts left by a finished
 *     brain. so this reaps the artifacts directly, off the clone record, never a
 *     process it must kill
 *   - every artifact a spawn wrote is removed here, so a prune leaves no dangling
 *     index entry a later reach would readlink into a gone dir: the serial index,
 *     the slug index, and each `.exids/` claim its transcripts held (so a future
 *     enroll in the same cwd may re-link that transcript afresh)
 *
 * .note = idempotent + ENOENT-safe: delFileSync treats an absent link as success,
 *   and rmSync force never throws on an absent dir, so a double reap is a benign
 *   no-op. the socket path is null on a non-POSIX host (no socket ever bound) —
 *   then there is no socket file to unlink
 * .note = the CROSS-HOST guard is the caller's (getAllClonesPrunable excludes a
 *   foreign clone): this reaps the LOCAL artifacts it is handed, and a cross-host
 *   clone's dir/socket live on another machine anyway
 */
export const delClone = (input: {
  clone: CloneOndisk;
  actorsRoot: string;
}): void => {
  const cloneDir = getCloneDir({
    actorDir: getActorOndiskDir({
      repoPath: input.clone.actor.repoPath,
      hash: input.clone.actor.hash,
    }),
    serial: input.clone.serial,
  });

  // remove the socket file (null on a non-POSIX host — no socket ever bound)
  const socketPath = getCloneSocketPath({ serial: input.clone.serial });
  if (socketPath !== null) delFileSync({ path: socketPath });

  // remove the serial index (always) and the slug index (only when named)
  delFileSync({
    path: join(
      getActorsIndexDir({ actorsRoot: input.actorsRoot, index: 'serials' }),
      input.clone.serial,
    ),
  });
  if (input.clone.slug !== null)
    delFileSync({
      path: join(
        getActorsIndexDir({ actorsRoot: input.actorsRoot, index: 'slugs' }),
        input.clone.slug,
      ),
    });

  // free each `.exids/` claim this clone's history held (its symlink names ARE the
  // exids), plus any `.ambiguous` quarantine marker beside it — so a future enroll
  // in the same cwd may re-link that transcript instead of skip it as claimed
  const exidsDir = getActorsIndexDir({
    actorsRoot: input.actorsRoot,
    index: 'exids',
  });
  for (const exid of getCloneHistoryExids({ cloneDir })) {
    delFileSync({ path: join(exidsDir, exid) });
    delFileSync({ path: join(exidsDir, `${exid}.ambiguous`) });
  }

  // remove the clone dir last (identity + history links)
  rmSync(cloneDir, { recursive: true, force: true });
};

/**
 * .what = the exids a clone's history holds — one per `<exid>.jsonl` symlink
 * .why = the history dir names each linked transcript by its exid, so its filenames
 *   (sans `.jsonl`) ARE the exids whose `.exids/` claims this clone owns
 * .note = an absent history dir yields none (a clone may never have linked one)
 */
const getCloneHistoryExids = (input: { cloneDir: string }): string[] => {
  const historyDir = getCloneHistoryDir({ cloneDir: input.cloneDir });
  try {
    return readdirSync(historyDir)
      .filter((name) => name.endsWith('.jsonl'))
      .map((name) => name.slice(0, -'.jsonl'.length));
  } catch (error) {
    // an absent history dir is the normal case for a clone that never linked one
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};
