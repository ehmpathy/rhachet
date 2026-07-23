import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import { getRoleDeltaMode } from '@src/domain.operations/roles/deltas/getRoleDeltaMode';
import { getRoleDeltas } from '@src/domain.operations/roles/deltas/getRoleDeltas';

/**
 * .what = wraps the shared `--roles` deltas into an enrollment spec
 * .why = enroll shares the ONE canonical `--roles` grammar with init
 *        (`getRoleDeltas`); this pairs the parsed deltas with their derived mode
 *        so `computeBrainCliEnrollment` consumes one uniform vocabulary.
 *
 * .note = tokens are already flattened upstream by `getRoleDeltaTokens`, so both
 *   the space form (`+a -b`) and the comma form (`+a,-b`) arrive here as the
 *   same natural token list.
 */
export const parseBrainCliEnrollmentSpec = (input: {
  tokens: string[];
}): BrainCliEnrollmentSpec => {
  // parse via the one shared grammar (dedupe, contradiction, mixed-call all handled)
  const deltas = getRoleDeltas({ tokens: input.tokens });

  // pair the deltas with their derived mode (absolute = replace, incremental = patch)
  return new BrainCliEnrollmentSpec({
    mode: getRoleDeltaMode({ deltas }),
    deltas,
  });
};
