import { asTreeBranch } from './asTreeBranch';

/**
 * .what = a flat list of rows, drawn as the branches of one treestruct list
 * .why = each report section hangs its rows under one header with the same `├─` / `└─`
 *   branches; one owner keeps every section's branches from drift
 *
 * .note = `indent` is the text ahead of each branch — the section's margin, plus the stem of
 *   any parent row the list hangs beneath
 */
export const asTreeReportLines = (input: {
  rows: string[];
  indent: string;
}): string[] =>
  input.rows.map((row, index) => {
    const { branch } = asTreeBranch({ index, count: input.rows.length });
    return `${input.indent}${branch} ${row}`;
  });
