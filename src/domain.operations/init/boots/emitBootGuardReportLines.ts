import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';

/**
 * .what = print the `🧢 .agent/repo=.this/role=any` block of boot guards created, closed by its
 *   blank line
 * .note = no guard created prints naught, not even a blank
 */
export const emitBootGuardReportLines = (input: { lines: string[] }): void => {
  if (input.lines.length === 0) return;
  console.log('🧢 .agent/repo=.this/role=any');
  for (const line of asTreeBranchLines({ rows: input.lines, indent: '   ' }))
    console.log(line);
  console.log('');
};
