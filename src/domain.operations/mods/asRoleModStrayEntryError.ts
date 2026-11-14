import { ConstraintError } from 'helpful-errors';

/**
 * .what = the refusal of an entry under `.agent/repo=.mods/` that names no role
 * .why = one message for the sync that gates on it and the reports that only name it
 *
 * .note = the fix names the dir repo-relative, the same vocabulary as every other mod readout
 */
export const asRoleModStrayEntryError = (input: {
  modsDir: string;
  entry: string;
}): Error =>
  new ConstraintError('a mods dir holds an entry that names no role', {
    modsDir: input.modsDir,
    entry: input.entry,
    fix: `rename .agent/repo=.mods/${input.entry} to .agent/repo=.mods/role=<slug>, or move it out of .agent/repo=.mods/`,
  });
