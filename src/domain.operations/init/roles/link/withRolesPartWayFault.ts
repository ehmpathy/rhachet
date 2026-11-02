import { asRolesPartWayFaultError } from './asRolesPartWayFaultError';

type RoleSlugs = { repo: string; role: string };

/**
 * .what = split the loop's roles at the one that faulted: which faulted, which linked, which did not
 * .why = the roles before the fault are linked; the faulted role is linked only when its init
 *   faulted, since its link landed first (F1); the roles after it are not linked
 */
const asRolesSplitAtFault = (input: {
  slugs: RoleSlugs[];
  faultAt: number;
  step: 'link' | 'init';
}): { failed: RoleSlugs; linked: RoleSlugs[]; notLinked: RoleSlugs[] } => {
  const linkedCount = input.step === 'init' ? input.faultAt + 1 : input.faultAt;
  return {
    failed: input.slugs[input.faultAt]!,
    linked: input.slugs.slice(0, linkedCount),
    notLinked: input.slugs.slice(linkedCount),
  };
};

/**
 * .what = run one step of the link loop; a fault of that step is named as a part-way fault
 * .why = the loop stops at the first faulted role (F5), so a tree is left with some roles linked and
 *   some not; a link fault and an init fault alike name all three sets, so the caller's resync and
 *   the human both see what the tree holds (vision case 3)
 */
export const withRolesPartWayFault = async <T>(
  input: { slugs: RoleSlugs[]; faultAt: number; step: 'link' | 'init' },
  procedure: () => T | Promise<T>,
): Promise<T> => {
  try {
    return await procedure();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw asRolesPartWayFaultError({
      cause: error,
      step: input.step,
      ...asRolesSplitAtFault(input),
    });
  }
};
