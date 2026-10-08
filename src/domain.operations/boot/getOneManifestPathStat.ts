import { ConstraintError } from 'helpful-errors';

import { type Stats, statSync } from 'node:fs';

/**
 * .what = the stat of a declared manifest path, or undefined where no entry sits there
 * .why = the fs probe behind `getOneBootSourceFromManifest`, named so the constructor reads as
 *        a narrative of guards rather than an inline errno table
 *
 * 🔴 .note = `throwIfNoEntry: false` suppresses an ABSENCE — and an absence, measured, is
 *   BOTH `ENOENT` and `ENOTDIR`; each returns `undefined`, and the caller's guard names it.
 *   every other fs fault still throws, and a raw node `Error` carries no exit classification,
 *   so a caller-fixable fault is lifted to a `ConstraintError` (exit 2) here
 *
 * 🔴 .note = the narrow is a CLOSED SET, and every member is a fault the caller can repair —
 *   a permission they can grant, or a path they can retype. an `EIO`, an `ENOMEM`, or any fault
 *   outside it escapes unchanged (`rule.forbid.failhide`): a disk fault reported as a caller
 *   defect sends a human to edit a path that was never wrong
 *
 * 🟡 .note = `ENOTDIR` is deliberately ABSENT from the set, and its absence was measured. node
 *   suppresses it under `throwIfNoEntry: false` exactly as it does `ENOENT`, so a row for it
 *   would be a branch that can never be taken
 */
export const getOneManifestPathStat = (input: {
  path: string;
  pathTaken: string;
}): Stats | undefined => {
  try {
    return statSync(input.pathTaken, { throwIfNoEntry: false });
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    const isCallerFixable =
      code === 'EACCES' || // the path, or a dir above it, denies a read
      code === 'EPERM' || //  the operation is not permitted
      code === 'ELOOP' || //  the path walks a symlink cycle
      code === 'ENAMETOOLONG'; // the argument exceeds the fs limit
    if (!isCallerFixable) throw error;

    const isPermissionFault = code === 'EACCES' || code === 'EPERM';
    throw new ConstraintError('--what is not a readable path', {
      path: input.path,
      pathTaken: input.pathTaken,
      why: `the filesystem refused the read (${code})`,
      hint: isPermissionFault
        ? 'grant read access to the path and every dir above it, or name a path you can read'
        : 'fix the path — it walks a symlink cycle, or it is longer than the fs allows',
    });
  }
};
