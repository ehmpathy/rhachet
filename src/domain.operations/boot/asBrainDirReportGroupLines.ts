import { asTreeBranch } from '@src/utils/asTreeBranch';

import type { BrainDirReportGroup } from './asBrainDirLayoutReportGroups';

/**
 * .what = the treestruct body of a brain dir tree: one branch per group, its rows beneath it
 * .why = the layout report and the sync report draw one tree shape, so a human reads both alike
 */
export const asBrainDirReportGroupLines = (input: {
  groups: BrainDirReportGroup[];
}): string[] =>
  input.groups.flatMap((group, groupIndex) => {
    const { branch: groupBranch, stem: groupStem } = asTreeBranch({
      index: groupIndex,
      count: input.groups.length,
    });
    return [
      `   ${groupBranch} ${group.label}`,
      ...group.rows.map((row, rowIndex) => {
        const { branch: rowBranch } = asTreeBranch({
          index: rowIndex,
          count: group.rows.length,
        });
        return `   ${groupStem}${rowBranch} ${row}`;
      }),
    ];
  });
