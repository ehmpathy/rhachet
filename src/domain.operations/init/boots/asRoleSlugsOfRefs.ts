import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

/**
 * .what = the role slugs a set of linked role refs names, in the refs' order
 * .why = a delta actor re-derives over role slugs alone; the repo half of each ref plays no
 *   part in which roles an actor holds
 */
export const asRoleSlugsOfRefs = (input: {
  refs: RoleLinkRef[];
}): RoleLinkRef['role'][] => input.refs.map((ref) => ref.role);
