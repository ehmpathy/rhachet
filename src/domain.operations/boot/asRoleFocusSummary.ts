import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';
import { asSubjectsElsewhere } from '@src/domain.operations/boot/asSubjectsElsewhere';
import { isAlwaysShed } from '@src/domain.operations/boot/isAlwaysShed';

/**
 * .what = what a focused render says about its focus — the subjects given, the subjects
 *         elsewhere, and whether `always` was shed — or null for a whole render
 * .why = the `<focus …/>` line tells the brain it holds part of the role, so it knows the rest
 *        lives elsewhere (V1); one transformer decides it, so the render reads as narrative
 */
export const asRoleFocusSummary = (input: {
  config: RoleBootSpec | null;
  subjects: string[];
}): { given: string[]; elsewhere: string[]; alwaysShed: boolean } | null => {
  // a whole render, or a role that declares no subjects, has no focus to name
  if (input.subjects.length === 0 || input.config?.mode !== 'subject')
    return null;

  return {
    given: input.subjects,
    elsewhere: asSubjectsElsewhere({
      declared: Object.keys(input.config.subjects),
      given: input.subjects,
    }),
    alwaysShed: isAlwaysShed({
      config: input.config,
      subjects: input.subjects,
    }),
  };
};
