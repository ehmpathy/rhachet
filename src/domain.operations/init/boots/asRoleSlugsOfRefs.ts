import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

/**
 * .what = the role slugs a set of linked role refs names, each once, in the refs' order
 * .why = a delta actor re-derives over role slugs alone; the repo half of each ref plays no
 *   part in which roles an actor holds
 *
 * .note = two repos may link one slug (F11); a bare slug carries both, so it is named once
 */
export const asRoleSlugsOfRefs = (input: {
  refs: RoleLinkRef[];
}): RoleLinkRef['role'][] => [...new Set(input.refs.map((ref) => ref.role))];
