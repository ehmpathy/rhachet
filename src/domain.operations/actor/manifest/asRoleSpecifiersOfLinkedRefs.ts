import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

/**
 * .what = the linked roles as `repo/role` specifiers, split into package roles and the repo's
 *         own native `.this` roles
 * .why = the drift check compares a declared union against what is linked; a package role can
 *        be short or extra, while a native role is only ever named (init never links one)
 */
export const asRoleSpecifiersOfLinkedRefs = (input: {
  refs: RoleLinkRef[];
}): { linked: string[]; linkedNative: string[] } => ({
  linked: input.refs
    .filter((ref) => ref.repo !== '.this')
    .map((ref) => `${ref.repo}/${ref.role}`),
  linkedNative: input.refs
    .filter((ref) => ref.repo === '.this')
    .map((ref) => `.this/${ref.role}`),
});
