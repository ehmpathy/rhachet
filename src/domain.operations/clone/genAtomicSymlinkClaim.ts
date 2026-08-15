import { mkdirSync, symlinkSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * .what = attempt to claim a name via an atomic exclusive symlink — true if THIS
 *   caller won, false if the name was already claimed
 * .why =
 *   - `symlink(2)` is atomic + exclusive: exactly one racer creates the link, the
 *     rest get EEXIST. so a symlink IS a lock the filesystem arbitrates, with no
 *     lock file to leak. three index families lean on this one election —
 *     `.slugs/<slug>` (the clone slug), `.exids/<exid>` (the transcript link), and
 *     `.exids/<exid>.ambiguous` (the quarantine marker) — so it is ONE primitive
 *   - the winner/loser split is returned as a boolean, NOT a throw: a lost claim is
 *     a normal outcome (a peer got there first), not a fault. a caller that needs
 *     to fail loud on a loss layers that decision on top (setCloneSlugIndex does)
 *
 * .note = the target is advisory (who claimed it / what it points at); the CLAIM is
 *   the link's existence. every non-EEXIST error surfaces — a real fs fault is not
 *   a "lost claim" and must never read as one (rule.forbid.failhide)
 */
export const genAtomicSymlinkClaim = (input: {
  linkPath: string;
  target: string;
}): boolean => {
  mkdirSync(dirname(input.linkPath), { recursive: true });
  try {
    symlinkSync(input.target, input.linkPath);
    return true;
  } catch (error) {
    // .code is realm-safe (an own property); `instanceof Error` is not, in jest
    if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') return false;
    throw error;
  }
};
