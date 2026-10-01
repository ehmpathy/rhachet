import { withBrainAuthWriteLock } from '@src/domain.operations/brain/auth/withBrainAuthWriteLock';
import { delFileSync } from '@src/infra/filesystem/delFileSync';
import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';
import { getFileStatOrNull } from '@src/infra/filesystem/getFileStatOrNull';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { getBrainDirAuthPath } from './getBrainDirAuthPath';
import { isBrainDirAuthAdoptable } from './isBrainDirAuthAdoptable';

/**
 * .what = retire the per-actor login a 1.48.0 enroll left in an actor's brain dir
 * .why = clones read the shared ~/.claude login; only a 1.48.0 clone still reads a
 *        brain-dir `.credentials.json`. so the file is kept while a clone of the actor
 *        lives, then removed — first adopted into ~/.claude only when the shared login
 *        is dead or absent (isBrainDirAuthAdoptable)
 *
 * .note = a symlink is removed as a link; its target — the shared login — is untouched
 * .note = the shared login is read, judged, and written under claude-code's own write
 *   lock (withBrainAuthWriteLock), so a `/login`, a refresh, or a peer enroll cannot
 *   interleave between the judgment and the write
 * .note = the brain-dir file is only read by 1.48.0 clones of this actor, and none lives
 *   past the probe, so the gap between the probe and the act touches no reader
 * .note = never reads into a log, nor returns, a token value
 */
export const setBrainDirAuthMigrated = async (
  input: { brainDir: string; brainAuthPath: string },
  context: { getLiveCount: () => Promise<number> },
): Promise<{
  outcome: 'none' | 'kept' | 'removed' | 'adopted';
  brainDirAuthPath: string;
  liveCount: number;
}> => {
  const brainDirAuthPath = getBrainDirAuthPath({ brainDir: input.brainDir });

  // lstat, so a dangled 1.48.0 symlink still counts as a leftover to retire
  const stat = getFileStatOrNull({ path: brainDirAuthPath });
  if (!stat) return { outcome: 'none', brainDirAuthPath, liveCount: 0 };

  // a live clone of the actor may still read this file — keep it until none lives
  const liveCount = await context.getLiveCount();
  if (liveCount > 0) return { outcome: 'kept', brainDirAuthPath, liveCount };

  // a live brain-dir login may be the box's only live token; adopt it under the lock
  const brainDirAuthContent = getFileContentOrNull({ path: brainDirAuthPath });
  const isAdopted = await withBrainAuthWriteLock(
    { brainAuthPath: input.brainAuthPath },
    () => {
      const isAdoptable = isBrainDirAuthAdoptable({
        brainDirAuthContent,
        brainAuthContent: getFileContentOrNull({ path: input.brainAuthPath }),
      });
      if (!isAdoptable || brainDirAuthContent === null) return false;
      setFileAtomic(
        { path: input.brainAuthPath, content: brainDirAuthContent },
        { mode: 0o600 },
      );
      return true;
    },
  );

  // the brain dir holds no login of its own from here on
  delFileSync({ path: brainDirAuthPath });
  return {
    outcome: isAdopted ? 'adopted' : 'removed',
    brainDirAuthPath,
    liveCount,
  };
};
