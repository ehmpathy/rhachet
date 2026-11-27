import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';

import { asRoleModFaultOrNull } from './asRoleModFaultOrNull';
import { withRoleModReadConfirmed } from './withRoleModReadConfirmed';

/**
 * .what = the mod gate: the verdict a boot reads for one role — modded, published, or skipped
 * .why = a mod is flavor and the seat is the job, so a mod fault never refuses a boot. the role
 *        boots as published, and the boot names the fault and its fix until it is cured
 *
 * .note = `TMod` is the mod as the freshness proof returns it; a caller's richer mod (with its
 *   view, say) flows through the gate with its own fields
 * .note = `context.read` is the boot's own proof that the view is fresh
 *   (`assertRoleModdedViewFresh`, `assertRoleModSparesNativeRole`); it returns the mod, null for
 *   an unmodded role, or throws
 * .note = a read that refuses is first confirmed under the role view lock, so a render mid-swap
 *   never skips a sound mod
 * .note = the catch admits a mod fault alone (F04, `asRoleModFaultOrNull`): a refusal, a corrupt
 *   record, an fs errno. every other throw, a code defect or a value no error class names,
 *   escapes loud, so a bug in rhachet is never reported as a fault of a mod a human wrote
 *   (`rule.forbid.failhide`)
 */
export const getOneRoleModVerdict = async <
  TMod extends { spec: RoleModSpec; plan: RoleModPlan; ofLabel: string },
>(
  input: { cwd: string | null },
  context: { read: () => TMod | null },
): Promise<
  | ({ verdict: 'modded' } & TMod)
  | { verdict: 'published' }
  | { verdict: 'skipped'; error: Error }
> => {
  try {
    const mod = await withRoleModReadConfirmed(
      { cwd: input.cwd },
      context.read,
    );
    if (!mod) return { verdict: 'published' };
    return { verdict: 'modded', ...mod };
  } catch (error: unknown) {
    const fault = asRoleModFaultOrNull({ error });
    if (!fault) throw error;
    return { verdict: 'skipped', error: fault };
  }
};
