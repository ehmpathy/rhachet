import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

/**
 * .what = every subject section a spec declares, by slug — empty where it declares none
 * .why = TWO questions turn on this one set, and they must not answer it separately:
 *          - `asBootRemedyMode` asks "is `narrow` a rung the ladder should offer?"
 *          - `genBootPayload` asks "which subjects does the halt's roster name?"
 *        a ladder that offers `narrow` beside a roster of none, or a roster beside a ladder
 *        with no `narrow`, is one predicate stated twice and drifted once.
 *
 * .note = null in yields `[]` rather than a throw. a boot with no spec declares no subject,
 *   which is an answer rather than an absence.
 */
export const getAllDeclaredSubjectSlugs = (input: {
  spec: RoleBootSpec | null;
}): string[] => {
  const { spec } = input;

  if (!spec) return [];
  if (spec.mode !== 'subject') return [];

  return Object.keys(spec.subjects);
};
