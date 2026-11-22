import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectLines } from './asRoleContentDefectLines';

/**
 * .what = the stop hook's notice of linked role content defects, as lines
 * .why = a linked defect is its supplier's to repair, never the clone's; one set of words names
 *        it on every stop surface, the json warn and the held stop alike
 */
export const asRoleContentDefectHookWarnLines = (input: {
  invocation: string;
  defects: RoleContentDefect[];
}): string[] => {
  const noun = `linked role content defect${input.defects.length === 1 ? '' : 's'}`;
  return [
    `🧢 ${input.invocation}`,
    `   └─ 🟡 ${input.defects.length} ${noun}, set aside at boot`,
    ...asRoleContentDefectLines({
      defects: input.defects,
      indent: '      ',
      peersAfter: 0,
    }),
  ];
};
