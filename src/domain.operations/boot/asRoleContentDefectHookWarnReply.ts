import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectHookWarnLines } from './asRoleContentDefectHookWarnLines';

/**
 * .what = the stop hook's json reply that warns of linked role content defects, held for none
 * .why = claude code shows no plain output of a stop hook that exits 0, and an exit 2 would hold
 *        the stop on a defect this repo cannot repair. a json reply with `systemMessage` on exit 0
 *        surfaces the warn and holds naught
 *        (https://code.claude.com/docs/en/hooks.md#exit-code-output)
 */
export const asRoleContentDefectHookWarnReply = (input: {
  invocation: string;
  defects: RoleContentDefect[];
}): string =>
  JSON.stringify({
    systemMessage: asRoleContentDefectHookWarnLines(input).join('\n'),
  });
