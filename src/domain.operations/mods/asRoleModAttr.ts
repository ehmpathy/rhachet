import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import { asPathRelPosix } from '@src/infra/filesystem/asPathRelPosix';

import { getOneRoleModProvenance } from './getOneRoleModProvenance';

/**
 * .what = the ` mod="shadow"` or ` mod="add"` attr of one resource, or '' for the role's own
 * .why = one attr for the boot body and the payload batches alike, so the two never disagree
 */
export const asRoleModAttr = (input: {
  plan: RoleModPlan;
  roleDir: string;
  path: string;
}): string => {
  const provenance = getOneRoleModProvenance({
    plan: input.plan,
    pathRel: asPathRelPosix({ from: input.roleDir, to: input.path }),
  });
  return provenance ? ` mod="${provenance}"` : '';
};
