import type { RoleSlug } from '@src/domain.objects/RoleSlug';

/**
 * .what = whether two rolesets hold the same roles — set-equal, order ignored
 * .why = the one roleset compare: the ambient check (`isRolesetAmbient`) and the delta
 *        re-derive (`setDeltaActorsOndisk`, "did the roles move?") both ask it
 */
export const isRolesetEqual = (input: {
  left: RoleSlug[];
  right: RoleSlug[];
}): boolean => {
  const setLeft = new Set(input.left);
  const setRight = new Set(input.right);
  if (setLeft.size !== setRight.size) return false;
  return [...setLeft].every((role) => setRight.has(role));
};
