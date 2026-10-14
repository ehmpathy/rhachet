import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getBrainHooksAdapterByConfigImplicit } from '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';

/**
 * .what = the brains detected in the repo that an installed brain package supplies a hooks
 *         adapter for
 * .why = the layout findsert writes `settings.of.repo.json` into the repo actor's brain dir in
 *        every repo whose roles boot (`inventory.of=requirements.case=8`), so detection alone
 *        reads claude in each of them. a repo with no claude adapter installed never asked for
 *        claude hooks, and its hook sync must not fail on that brain
 *
 * .note = only auto-detection is filtered: an explicit `--hooks <brain>` with no adapter still
 *   fails loud, per role, in `syncAllRoleHooksIntoEachBrainRepl`
 * .note = a lookup that faults (e.g. two adapters match) keeps the brain, so the sync reports
 *   that fault per role, as before; a code defect surfaces at once
 * .note = sequential, so the stderr rows of a failed package load print in a stable order
 */
export const getBrainsDetectedAndSupplied = async (
  context: ContextCli,
): Promise<BrainSpecifier[]> => {
  const detected = await detectBrainReplsInRepo(context);
  const supplied: BrainSpecifier[] = [];
  // .note = deliberate mutation — a local list, filled in order, one lookup at a time
  for (const brain of detected) {
    if (await isBrainSuppliedOrFaulted({ brain }, context))
      supplied.push(brain);
  }
  return supplied;
};

/**
 * .what = whether a brain package supplies this brain's hooks adapter, or the lookup faulted
 */
const isBrainSuppliedOrFaulted = async (
  input: { brain: BrainSpecifier },
  context: ContextCli,
): Promise<boolean> => {
  try {
    const adapter = await getBrainHooksAdapterByConfigImplicit(
      { brain: input.brain },
      context,
    );
    return adapter !== null;
  } catch (error) {
    if (isCodeDefectError({ error })) throw error;
    return true;
  }
};
