import { getAllRepoThisRolesWithHooks } from './getAllRepoThisRolesWithHooks';

/**
 * .what = whether this repo arms the framework-owned onStop sweep
 * .why = a content defect set aside at birth is held again only by that sweep. where no sweep is
 *        armed, the birth receipt is the one notice, and it must say so
 *        (`rule.forbid.content-checks-that-halt-enroll`)
 *
 * .note = it reads the same arms the hook sync relays — a `.this` budget, or a mod dir — so the
 *   receipt and the hooks cannot disagree on whether a stop will repeat the notice
 */
export const isRepoStopSweepArmed = (input: { gitroot: string }): boolean =>
  getAllRepoThisRolesWithHooks({ gitroot: input.gitroot }).roles.length > 0;
