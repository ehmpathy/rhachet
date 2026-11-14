import { isErrnoEnoent } from '@src/infra/filesystem/isErrnoEnoent';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const PREFIX_ROLE_DIR = 'role=';

/**
 * .what = the entries of a dir, or none where the dir is absent
 * .why = a repo with no `.agent/repo=.mods/` has no mods; any other read error is real
 *
 * .note = the read IS the check, so a dir that vanished after a probe lands on the same branch
 */
const getAllEntriesOrNone = (input: { dir: string }): string[] => {
  try {
    return readdirSync(input.dir);
  } catch (error: unknown) {
    if (isErrnoEnoent(error)) return [];
    throw error;
  }
};

/**
 * .what = the entries under `.agent/repo=.mods/`: the role slug of each `role=*` mod dir, and
 *         each other entry that names no role
 * .why = the mods dir is read by several callers — the mods sync, the upgrade drift readout, and
 *        the unplaced-mod report. one reader, below all, so each sees the same set
 *
 * .note = a dotfile (`.gitkeep`, `.DS_Store`) is no entry at all; it is neither a slug nor stray
 * .note = it never refuses a stray; each caller decides whether a stray gates or is reported
 * .note = both lists are sorted, so the walk and every report it feeds are stable on any fs
 */
export const getAllRoleModEntries = (input: {
  cwd: string;
}): { modsDir: string; slugs: string[]; strays: string[] } => {
  const modsDir = join(input.cwd, '.agent', 'repo=.mods');
  const entries = getAllEntriesOrNone({ dir: modsDir })
    .filter((entry) => !entry.startsWith('.'))
    .sort();
  const slugs = entries
    .filter((entry) => entry.startsWith(PREFIX_ROLE_DIR))
    .map((entry) => entry.slice(PREFIX_ROLE_DIR.length));
  const strays = entries.filter((entry) => !entry.startsWith(PREFIX_ROLE_DIR));
  return { modsDir, slugs, strays };
};
