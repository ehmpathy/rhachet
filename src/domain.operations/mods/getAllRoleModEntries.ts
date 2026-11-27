import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { PREFIX_ROLE_DIR } from '@src/domain.operations/role/constants';
import { asErrnoCode } from '@src/infra/filesystem/asErrnoCode';
import { isErrnoEnoent } from '@src/infra/filesystem/isErrnoEnoent';

import { readdirSync } from 'node:fs';
import { asRoleModsDir } from './asRoleModsDir';

/**
 * .what = the errnos of a mods path the caller can repair: a file where the dir belongs, a dir
 *         with no read access, or a link loop
 * .why = each is a fault of the repo, so it is a ConstraintError; any other errno is the host's
 */
const ERRNOS_OF_MODS_PATH_REPAIRABLE = new Set([
  'ENOTDIR',
  'EACCES',
  'EPERM',
  'ELOOP',
]);

/**
 * .what = the fix for a mods path that cannot be read, by its errno
 * .why = a file where the dir belongs and a dir with no read access each need a different move
 */
const asModsPathFix = (input: { code: string }): string => {
  if (input.code === 'ENOTDIR')
    return 'move the file aside, so .agent/repo=.mods is a dir or absent';
  if (input.code === 'EACCES' || input.code === 'EPERM')
    return 'grant read access, via chmod u+rx .agent/repo=.mods';
  return 'repair .agent/repo=.mods so it reads as a dir, or remove it';
};

/**
 * .what = the fault of a mods path that cannot be read: a constraint where the repo can repair
 *         it, else a malfunction of the host
 * .why = the class names who fixes it; each still carries its fix, so the boot can name it
 */
const asModsPathFault = (input: { dir: string; code: string }): Error => {
  const metadata = {
    modsDir: input.dir,
    // .note = `errno`, never `code`: helpful-errors reads a `code` key as its own option
    errno: input.code,
    fix: asModsPathFix({ code: input.code }),
  };
  if (ERRNOS_OF_MODS_PATH_REPAIRABLE.has(input.code))
    return new ConstraintError('the mods path cannot be read', metadata);
  return new MalfunctionError('the mods path cannot be read', metadata);
};

/**
 * .what = the entries of a dir, none where the dir is absent, or the fault that stops the read
 * .why = a repo with no `.agent/repo=.mods/` has no mods; a mods path that cannot be read is a
 *        fault of the repo (C13), which no boot may refuse on, so it is returned, never thrown
 *
 * .note = the read IS the check, so a dir that vanished after a probe lands on the same branch
 * .note = only an errno fault is returned; any other throw is a defect and escapes
 */
const getAllEntriesOrFault = (input: {
  dir: string;
}): { entries: string[]; fault: Error | null } => {
  try {
    return { entries: readdirSync(input.dir), fault: null };
  } catch (error: unknown) {
    if (isErrnoEnoent(error)) return { entries: [], fault: null };
    const code = asErrnoCode({ error });
    if (code === null) throw error;
    return { entries: [], fault: asModsPathFault({ dir: input.dir, code }) };
  }
};

/**
 * .what = the mods dir entries, split into role slugs and strays, each sorted
 * .why = a `role=*` entry is a mod of that role; any other entry names no role. a dotfile
 *        (`.gitkeep`, `.DS_Store`) is no entry at all
 */
const asRoleModEntriesPartitioned = (input: {
  entries: string[];
}): { slugs: string[]; strays: string[] } => {
  const entries = input.entries
    .filter((entry) => !entry.startsWith('.'))
    .sort();
  return {
    slugs: entries
      .filter((entry) => entry.startsWith(PREFIX_ROLE_DIR))
      .map((entry) => entry.slice(PREFIX_ROLE_DIR.length)),
    strays: entries.filter((entry) => !entry.startsWith(PREFIX_ROLE_DIR)),
  };
};

/**
 * .what = the entries under `.agent/repo=.mods/`: the role slug of each `role=*` mod dir, each
 *         other entry that names no role, and the fault where the path cannot be read
 * .why = the mods dir is read by several callers — the mods sync, the upgrade drift readout, the
 *        unplaced-mod report, and the stop sweep. one reader, below all, so each sees the same set
 *
 * .note = it never refuses a stray or a fault; each caller decides whether one gates or is named
 * .note = both lists are sorted, so the walk and every report it feeds are stable on any fs
 */
export const getAllRoleModEntries = (input: {
  cwd: string;
}): {
  modsDir: string;
  slugs: string[];
  strays: string[];
  fault: Error | null;
} => {
  const modsDir = asRoleModsDir({ cwd: input.cwd });
  const { entries, fault } = getAllEntriesOrFault({ dir: modsDir });
  const { slugs, strays } = asRoleModEntriesPartitioned({ entries });
  return { modsDir, slugs, strays, fault };
};
