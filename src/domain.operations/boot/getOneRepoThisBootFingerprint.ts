import glob from 'fast-glob';
import { ConstraintError } from 'helpful-errors';

import { BOOT_WALK_DIRS_SKIPPED } from '@src/domain.operations/role/briefs/constants';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { asBootFingerprintDigest } from './asBootFingerprintDigest';

/**
 * .what = the reach the onStop budget hook sweeps — this repo's own roles, and no other
 * .why = the hook guards the one population whose boot grows without upkeep: the specs a
 *        repo authors for itself. a linked role is its supplier's to cap, and a route
 *        manifest is its route's, so neither belongs to a hook that fires on every stop
 */
export const GLOBS_REPO_THIS_BOOT = ['.agent/repo=.this/role=*/boot.yml'];

/**
 * .what = the one line a file contributes to the fingerprint
 * .why = the glob and the read are a check-then-read pair, and a rebase, a relink, or an
 *        editor's unlink+create can remove a matched path between them
 *
 * .note = only `ENOENT` is re-classed, to a `ConstraintError` (exit 2), as its peer readers
 *   do (`readOneBootSpecFile`, `getAllBootSayResources`). the caller's own tree moved and a
 *   re-run on a settled tree fixes it. every other errno escapes unchanged
 */
const getOneFingerprintLine = (input: {
  cwd: string;
  path: string;
}): string => {
  try {
    const digest = createHash('sha256')
      .update(readFileSync(input.path))
      .digest('hex');
    return `${relative(input.cwd, input.path)}:${digest}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
    throw new ConstraintError(
      'a boot file vanished between the glob and the read',
      {
        path: input.path,
        why: 'the file was found on disk, then was removed or relinked',
        hint: 're-run — a settled tree reads cleanly',
      },
    );
  }
};

/**
 * .what = a content address of every input the `.this` boot costs read
 * .why = the hook fires on every stop, so it must skip the tokenizer when naught changed.
 *        a fingerprint that moves on any edit under any `.agent/repo=.this` role dir is the
 *        cheapest proof the prior within-budget verdict still holds
 *
 * .note = every file is hashed by path and CONTENT, never by size or mtime. a copy that keeps
 *   its timestamps (`cp -p`, `rsync -t`, a tar restore) can rewrite a brief at the same size
 *   and mtime, and a stat-keyed memo would then reuse a stale within-budget verdict
 *
 * .note = the walk is the payload's walk (`getAllFilesFromDir` with `BOOT_WALK_DIRS_SKIPPED`),
 *   so the fingerprint and the payload reach one file set, and a symlink into a package tree
 *   under a `.this` role dir is not walked on every stop
 */
export const getOneRepoThisBootFingerprint = async (input: {
  cwd: string;
  version: string;
}): Promise<string> => {
  const lines = await getAllRepoThisBootFingerprintLines({ cwd: input.cwd });
  return asBootFingerprintDigest({ version: input.version, lines });
};

/**
 * .what = the per-file signature lines of every file under the `.this` role dirs
 * .why = the i/o half of the fingerprint — the glob and the per-file content hashes —
 *        kept apart from the pure digest so each grain has one job
 */
const getAllRepoThisBootFingerprintLines = async (input: {
  cwd: string;
}): Promise<string[]> => {
  // find each `.this` role dir — one level, so no descent and no cycle
  const dirsRole = await glob(['.agent/repo=.this/role=*'], {
    cwd: input.cwd,
    absolute: true,
    onlyDirectories: true,
    dot: true,
    deep: 1,
  });

  // walk each role dir with the payload's own walk and skip list, so the fingerprint reaches
  //   exactly the files `genBootPayload` measures. its realpath ancestor guard ends a symlink
  //   cycle without a depth cap, so no file deep in the tree falls outside the fingerprint
  const paths = dirsRole.flatMap((dir) =>
    getAllFilesFromDir({ dir }, { skipDirNames: BOOT_WALK_DIRS_SKIPPED }),
  );
  return paths.map((path) => getOneFingerprintLine({ cwd: input.cwd, path }));
};
