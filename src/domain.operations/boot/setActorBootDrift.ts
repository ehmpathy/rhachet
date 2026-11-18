import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBootDelta } from './asBootDelta';
import { BRAIN_DIR_BOOT_FILENAMES } from './constants';

/**
 * .what = write the drift of one boot revision: the delta from the revision's boot to the
 *         actor's current boot, into the revision's `CLAUDE.md`
 * .why = a clone spawned on the revision reads that `CLAUDE.md` at compaction, so it holds
 *        the actor's current boot without a respawn and without a change to its cached
 *        system prompt
 *
 * .note = an unchanged drift is not re-written, so a re-render with no change touches no file
 * .note = no drift writes an empty `CLAUDE.md`: the clone reads naught extra
 */
export const setActorBootDrift = (input: {
  revisionDir: string;
  bootMdPathCurrent: string;
}): { outcome: 'rewritten' | 'unchanged'; lines: number } => {
  // the delta from the revision's boot to the current one
  const delta = asBootDelta({
    bootSpawned: readFileSync(
      join(input.revisionDir, BRAIN_DIR_BOOT_FILENAMES.bootMd),
      'utf8',
    ),
    bootCurrent: readFileSync(input.bootMdPathCurrent, 'utf8'),
  });
  const content = delta.markdown ?? '';

  // skip the write when the drift on disk already says the same
  const claudeMdPath = join(
    input.revisionDir,
    BRAIN_DIR_BOOT_FILENAMES.claudeMd,
  );
  const contentPrior = existsSync(claudeMdPath)
    ? readFileSync(claudeMdPath, 'utf8')
    : null;
  if (contentPrior === content)
    return { outcome: 'unchanged', lines: delta.lines };

  setFileAtomic({ path: claudeMdPath, content });
  return { outcome: 'rewritten', lines: delta.lines };
};
