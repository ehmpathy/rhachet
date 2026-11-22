import { ConstraintError } from 'helpful-errors';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectLines } from './asRoleContentDefectLines';

/**
 * .what = the onStop hook's hold for content defects in this repo's own roles
 * .why = a birth set these aside so the clone was born; the stop is where the clone that can
 *        repair them is asked to, in the shape the budget hold already speaks
 */
export const asRoleContentDefectHookReadout = (input: {
  invocation: string;
  defects: RoleContentDefect[];
}): string[] => {
  const noun = `role content defect${input.defects.length === 1 ? '' : 's'}`;
  return [
    `🧢 ${input.invocation}`,
    `   └─ ${ConstraintError.emoji} ${ConstraintError.name}: ${input.defects.length} ${noun}, set aside at boot`,
    ...asRoleContentDefectLines({
      defects: input.defects,
      indent: '      ',
      peersAfter: 0,
    }),
    ``,
  ];
};
