import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

/**
 * .what = the content defects a `.this` role dir owes, given whether a boot reads it
 * .why = a `.this` role dir with no `boot.yml` is a folder of notes that no actor boots
 *        (`getAllNativeRoleRefs`). an orphan `.md.min` is a broken file pair there all the same,
 *        so it still holds the stop. a boundary literal only splits the prompt from inside a
 *        booted body, so in a dir no boot reads it splits naught and holds naught
 */
export const asRoleContentDefectsOfRoleDir = (input: {
  defects: RoleContentDefect[];
  isRoleBooted: boolean;
}): RoleContentDefect[] =>
  input.isRoleBooted
    ? input.defects
    : input.defects.filter((defect) => defect.kind !== 'boundary-literal');
