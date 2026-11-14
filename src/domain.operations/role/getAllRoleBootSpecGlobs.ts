import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

/**
 * .what = every glob one key (say, ref, or not) declares for one kind, across every section
 * .why = the two boot modes nest their `briefs` / `skills` keys at different depths; one walk,
 *        so the boot plan and the mod plan read a spec's globs the same way
 *
 * .note = simple mode is one section; subject mode is `always` plus each subject. a `not` in
 *   any section excludes from the whole payload, so one subject's silence never undoes it
 */
export const getAllRoleBootSpecGlobs = (input: {
  spec: RoleBootSpec | null;
  kind: 'briefs' | 'skills';
  key: 'say' | 'ref' | 'not';
}): string[] => {
  if (!input.spec) return [];
  const sections =
    input.spec.mode === 'simple'
      ? [input.spec]
      : [input.spec.always, ...Object.values(input.spec.subjects)];
  return sections.flatMap(
    (section) => section?.[input.kind]?.[input.key] ?? [],
  );
};
