import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

/**
 * .what = whether a subject-mode boot sheds the role's `always` section
 * .why = a subject may declare `inherit: { always: false }`, so a small focus need not carry
 *        the whole `always` block. one selected subject that still inherits keeps it, since
 *        its author relied on it
 *
 * .note = a boot of every subject (no `subjects` named) always keeps `always`
 * .note = pure transformer — no i/o, deterministic
 */
export const isAlwaysShed = (input: {
  config: RoleBootSpec;
  subjects: string[] | null;
}): boolean => {
  // a spec with no subject sections has no subject to opt out of `always`
  if (input.config.mode !== 'subject') return false;

  // no subject named means every subject boots, and the whole role keeps `always`
  if (!input.subjects?.length) return false;

  // shed only when every selected subject opts out
  const { subjects } = input.config;
  return input.subjects.every(
    (slug) => subjects[slug]?.inherit.always === false,
  );
};
