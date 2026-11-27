import { asErrnoCode } from '@src/infra/filesystem/asErrnoCode';

import { realpathSync } from 'node:fs';
import { sep } from 'node:path';
import { asRoleModsDir } from './asRoleModsDir';

/**
 * .what = the errnos of a path that has no real path to read
 */
const ERRNOS_OF_PATH_UNREAL: ReadonlySet<string> = new Set([
  'ENOENT',
  'ENOTDIR',
  'EACCES',
  'EPERM',
  'ELOOP',
]);

/**
 * .what = the real path of a path, or null where it does not lead to a file
 * .why = an absent, broken, or unreadable path has no real path, yet the filter must still
 *        decide on it; any other fault throws loud (`rule.forbid.failhide`)
 */
const getOneRealPathOrNull = (input: { path: string }): string | null => {
  try {
    return realpathSync(input.path);
  } catch (error: unknown) {
    const code = asErrnoCode({ error });
    if (code && ERRNOS_OF_PATH_UNREAL.has(code)) return null;
    throw error;
  }
};

/**
 * .what = whether a file truly lives outside a dir, by its real path
 * .why = a file whose real path cannot be read may be a mod file behind a broken link, so it
 *        counts as inside: a dropped file costs one line of a role already flagged skipped,
 *        where a kept one would leak a mod into a boot that promised none (F03)
 */
const isFileOutsideDir = (input: {
  file: string;
  dirPrefix: string;
}): boolean => {
  const real = getOneRealPathOrNull({ path: input.file });
  if (real === null) return false;
  return !real.startsWith(input.dirPrefix);
};

/**
 * .what = the same file list, less every file whose real path sits under the mods dir
 * .why = a skipped mod is skipped whole (F03): a view on disk may still link a mod file — a
 *        stray in a kind dir, a corrupt record, a view that lags its mod — so the boot of a
 *        skipped role drops each such file by where it truly lives, never by trust in the view
 *
 * .note = the mods dir is compared by its own real path too, so a symlinked
 *   `.agent/repo=.mods` is covered
 * .note = a file whose real path cannot be read is dropped (`isFileOutsideDir`)
 */
export const getAllFilesLessModFiles = (input: {
  files: string[];
  cwd: string;
}): string[] => {
  const modsDir = asRoleModsDir({ cwd: input.cwd });
  const modsDirReal = getOneRealPathOrNull({ path: modsDir }) ?? modsDir;
  const dirPrefix = `${modsDirReal}${sep}`;
  return input.files.filter((file) => isFileOutsideDir({ file, dirPrefix }));
};
