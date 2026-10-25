import { ConstraintError } from 'helpful-errors';

import { statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the errnos that mean "this process may not write here"
 */
const ERRNOS_OF_NO_WRITE = new Set(['EACCES', 'EPERM', 'EROFS']);

/**
 * .what = refuse an `rhx init` whose repo actor brain dir this process cannot write
 * .why = each role init writes through `<repo>/.claude` into this dir; with no write, the first
 *   role links and its init faults deep in a role's executable, which leaves a part-way tree. a
 *   probe before any role names the dir, its owner and its mode instead (vision case 2)
 *
 * .note = the probe is one create-and-unlink of a file whose name carries this pid, so two inits
 *   never race on one probe file
 * .note = any other errno is thrown as found: only a denied write reads as "not writable"
 */
export const assertRepoActorBrainDirWritable = (input: {
  repoActorBrainDir: string;
}): void => {
  const probePath = join(
    input.repoActorBrainDir,
    `.rhachet.write-probe.${process.pid}`,
  );
  try {
    writeFileSync(probePath, '', { flag: 'wx' });
    unlinkSync(probePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? '';
    if (!ERRNOS_OF_NO_WRITE.has(code)) throw error;
    const stat = statSync(input.repoActorBrainDir);
    throw new ConstraintError('the repo actor brain dir is not writable', {
      path: input.repoActorBrainDir,
      errno: code,
      owner: { uid: stat.uid, gid: stat.gid },
      mode: (stat.mode & 0o777).toString(8),
      hint: `grant this user write to ${input.repoActorBrainDir}, then rerun \`rhx init\`; no role was linked`,
    });
  }
};
