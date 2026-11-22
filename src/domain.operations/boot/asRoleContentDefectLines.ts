import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { asRoleContentDefectNote } from './asRoleContentDefectNote';

/**
 * .what = the treestruct rows for a set of content defects, one per file, its note beneath
 * .why = the birth receipt, the stop hold, and the stop warn each list the same defects, so one
 *        renderer keeps the three in one shape
 *
 * .note = `indent` is the trunk the rows hang from, so a caller nests them under its own header
 * .note = `peersAfter` counts the branches a caller hangs below the last defect, so its elbow
 *   reads `├─` rather than claim a terminus the tree does not have
 * .note = a `spec-unparsed` defect carries the parse error as a second child, so the fix's line
 *   is one read away
 */
export const asRoleContentDefectLines = (input: {
  defects: RoleContentDefect[];
  indent: string;
  peersAfter: number;
}): string[] =>
  input.defects.flatMap((defect, index) => {
    const position = {
      index,
      length: input.defects.length + input.peersAfter,
    };
    return [
      `${input.indent}${getOneTreeElbow(position)} ${defect.pathToFile}`,
      ...asTreeBranchLines({
        rows: [
          ...asRoleContentDefectNote({ defect }),
          ...(defect.detail ? [defect.detail] : []),
        ],
        indent: `${input.indent}${getOneTreeSpine(position)}`,
      }),
    ];
  });
