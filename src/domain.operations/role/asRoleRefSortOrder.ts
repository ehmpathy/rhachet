import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

/**
 * .what = the sort order of two role refs, by `repo/role` in code-point order
 * .why = a three-way compare: equal keys return 0, so a sort over it is consistent and the set
 *        reads the same on any fs
 */
export const asRoleRefSortOrder = (input: {
  a: RoleLinkRef;
  b: RoleLinkRef;
}): -1 | 0 | 1 => {
  const keyA = `${input.a.repo}/${input.a.role}`;
  const keyB = `${input.b.repo}/${input.b.role}`;
  if (keyA === keyB) return 0;
  return keyA < keyB ? -1 : 1;
};
