import { ConstraintError } from 'helpful-errors';

import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { asAwsProfileExportDiskFixHint } from './asAwsProfileExportDiskFixHint';
import { getOneAwsProfileExportCacheDir } from './getOneAwsProfileExportCacheDir';

/**
 * .what = the names in a dir, or none if the dir is absent
 * .why = an absent cache dir means no export was ever cached; naught to drop
 */
const getAllNamesInDir = (input: { dir: string }): string[] => {
  try {
    return readdirSync(input.dir);
  } catch (error) {
    // .cast = node fs errors carry `code` at the external boundary; only ENOENT means absent
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};

/**
 * .what = drop every cached export of one profile, under any config files; a no-op if none
 * .why = a relock must leave no creds of the profile at rest, else a `get` after the relock
 *   would still be served from the cache until near expiry
 * .note = the files are named `profile=$encoded.$sha8.json`; a name must be the prefix, then
 *   exactly a sha8 and `.json`, so `acme` never drops `acme.prod`'s files
 */
export const delAwsProfileExport = (input: { profile: string }): void => {
  const cacheDir = getOneAwsProfileExportCacheDir();
  const prefix = `profile=${encodeURIComponent(input.profile)}.`;
  try {
    getAllNamesInDir({ dir: cacheDir })
      .filter(
        (name) =>
          name.startsWith(prefix) &&
          /^[0-9a-f]{8}\.json$/.test(name.slice(prefix.length)),
      )
      .forEach((name) => rmSync(join(cacheDir, name), { force: true }));
  } catch (error) {
    // .note = a node fs error may come from another realm (a jest sandbox), so read it by shape
    // .note = a refused cache path is the caller's to fix, so a ConstraintError, whose hint the
    //         unlock row shows
    const diskError = String(
      (error as { message?: unknown })?.message ?? error,
    );
    throw new ConstraintError('aws export cache drop failed', {
      profile: input.profile,
      path: cacheDir,
      diskError,
      hint: asAwsProfileExportDiskFixHint({ path: cacheDir, error }),
      cause: error instanceof Error ? error : undefined,
    });
  }
};
