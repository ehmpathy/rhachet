import { isHookAuthorOfEnrolledRoles } from '@src/domain.operations/enroll/isHookAuthorOfEnrolledRoles';

import { getAllRepoThisRolesWithHooks } from './getAllRepoThisRolesWithHooks';

/**
 * .what = whether the stop sweep fires for one clone: the repo arms it, and the clone's
 *         settings keep the carrier role's hook
 * .why = a clone keeps only the hooks its own roles author (`getSettingsForRoles`). a clone
 *        whose roles omit the carrier gets no stop hold, so its birth receipt must say the
 *        receipt is its one notice, even in an armed repo
 *
 * .note = the repo actor keeps the repo's hooks whole, so an armed repo arms every one of its
 *   clones; any other actor holds the sweep only where one of its roles is the carrier
 */
export const isCloneStopSweepArmed = (input: {
  gitroot: string;
  roles: string[];
  isRepoActor: boolean;
}): boolean => {
  const carrier = getAllRepoThisRolesWithHooks({ gitroot: input.gitroot })
    .roles[0];
  if (!carrier) return false;
  if (input.isRepoActor) return true;
  return (
    isHookAuthorOfEnrolledRoles({
      author: `repo=.this/role=${carrier.slug}`,
      roles: input.roles,
    }) === true
  );
};
