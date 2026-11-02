import { ConstraintError } from 'helpful-errors';

import {
  closeSync,
  openSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the errnos that mean "this process may not write here"
 */
const ERRNOS_OF_NO_WRITE = new Set(['EACCES', 'EPERM', 'EROFS']);

/**
 * .what = the errno of a fault that means "this process may not write here", or null
 */
const getOneErrnoOfNoWriteOrNull = (input: {
  error: unknown;
}): string | null => {
  const code = (input.error as NodeJS.ErrnoException)?.code ?? '';
  return ERRNOS_OF_NO_WRITE.has(code) ? code : null;
};

/**
 * .what = refuse an `rhx init` whose repo actor brain dir, or the settings file a role init writes,
 *   this process cannot write
 * .why = each role init writes through `<repo>/.claude` into this dir, and into
 *   `settings.of.repo.json` by name; with no write, the first role links and its init faults deep in
 *   a role's executable, which leaves a part-way tree. a probe before any role names the target, its
 *   owner and its mode instead (vision case 2, inventory case=10)
 *
 * .note = probe one: a create of a file whose name carries this pid (so two inits never race on one
 *   probe file), then its removal. probe two: an open-for-write of `settings.of.repo.json` with
 *   flag `r+`, which writes no byte and creates no file (flag `a` would create an absent one); an
 *   absent file is skipped, since probe one already proved the dir takes a create
 * .note = any errno other than a denied write is thrown as found, and so is a fault to remove the
 *   probe file: neither reads as "not writable"
 */
export const assertRepoActorBrainDirWritable = (input: {
  repoActorBrainDir: string;
}): void => {
  // probe one: the dir takes a create
  const probePath = join(
    input.repoActorBrainDir,
    `.rhachet.write-probe.${process.pid}`,
  );
  try {
    writeFileSync(probePath, '', { flag: 'wx' });
  } catch (error) {
    const errno = getOneErrnoOfNoWriteOrNull({ error });
    if (!errno) throw error;
    throw asNotWritableError({
      ...input,
      target: input.repoActorBrainDir,
      errno,
    });
  }
  unlinkSync(probePath);

  // probe two: the settings file a role init writes takes an append
  const settingsPath = join(input.repoActorBrainDir, 'settings.of.repo.json');
  try {
    closeSync(openSync(settingsPath, 'r+')); // 'r+' asks for write, yet never creates
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return;
    const errno = getOneErrnoOfNoWriteOrNull({ error });
    if (!errno) throw error;
    throw asNotWritableError({ ...input, target: settingsPath, errno });
  }
};

/**
 * .what = the refusal for a probe target this process cannot write: path, errno, owner and mode
 */
const asNotWritableError = (input: {
  repoActorBrainDir: string;
  target: string;
  errno: string;
}) => {
  const stat = statSync(input.target);
  return new ConstraintError('the repo actor brain dir is not writable', {
    path: input.repoActorBrainDir,
    probe: input.target,
    errno: input.errno,
    owner: { uid: stat.uid, gid: stat.gid },
    mode: (stat.mode & 0o777).toString(8),
    hint: `grant this user write to ${input.target}, then rerun \`rhx init\`; no role was linked`,
  });
};
