import { ConstraintError } from 'helpful-errors';

import type { BrainSlug } from '@src/domain.objects/BrainSlug';

/**
 * .what = derive the ONE brain to enroll from the three input forms
 * .why =
 *   - `rhx enroll` accepts the brain three ways, one sense: absent (→ the repo
 *     default), `--brain <b>` (the flag form), or `<b>` (the positional form).
 *     the flag and positional are aliases; absence falls back to the default
 *   - when a flag and a positional are BOTH given they must agree, else the
 *     surface fails loud and names both values in conflict (never silently
 *     picks one) — rule.require.errors-name-the-fix
 *
 * .note = a caller fault (a conflict, or no brain and no default) is a
 *   ConstraintError (exit 2), never a MalfunctionError — the human must fix the
 *   input, the machine did not break
 */
export const computeBrainCliInput = (input: {
  positional: BrainSlug | null;
  flag: BrainSlug | null;
  default: BrainSlug | null;
}): BrainSlug => {
  const { positional, flag, default: fallback } = input;

  // a flag AND a positional that disagree is an ambiguous brain — fail loud
  if (positional !== null && flag !== null && positional !== flag)
    return ConstraintError.throw(
      `brain conflict: positional '${positional}' vs --brain '${flag}'. pass just one, or make them match`,
      { positional, flag },
    );

  // the flag or positional (they agree if both present) names the brain
  const named = flag ?? positional;
  if (named !== null) return named;

  // neither given — fall back to the repo default, or fail loud if there is none
  if (fallback !== null) return fallback;

  return ConstraintError.throw(
    'no brain given and no default brain available. name one, e.g. `rhx enroll claude` or `rhx enroll --brain claude`.',
    {},
  );
};
