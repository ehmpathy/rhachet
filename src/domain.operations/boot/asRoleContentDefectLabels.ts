import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

/**
 * .what = one `path (kind)` label per defect, for an error's metadata
 * .why = each refusal that names content defects names them the same way, so a caller that
 *        branches on the metadata reads one shape
 */
export const asRoleContentDefectLabels = (input: {
  defects: RoleContentDefect[];
}): string[] => input.defects.map((one) => `${one.pathToFile} (${one.kind})`);
