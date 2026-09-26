/**
 * .what = slices the `🧠 brain dir (<label>)` treestruct block out of cli stdout — its
 *   head line plus every indented row beneath it, and `''` where no such block rendered
 *
 * .why = a brain dir reports as ONE tree now, never as a `boot.md (<label>): …` census
 *   line. a snapshot of whole stdout would drag in every volatile span around it, and a
 *   `toContain` of one row proves naught about the tree's order, glyphs, or phrasing — the
 *   three spans a human actually reads (`rule.require.treestruct-output`)
 *
 * .why a SHARED slicer = the upgrade suite and the default-actor migration journey both
 *   assert this one block, and each would otherwise re-derive the slice inline
 *   (`rule.require.shared-test-fixtures`)
 *
 * .note = an EMPTY return is a real, asserted outcome, never a miss: the report is silent
 *   when the sync changed naught but the corpus render. pair this with a positive assert
 *   on disk, never alone (`rule.forbid.failhide`)
 */
export const asBrainDirReportBlock = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  const head = lines.findIndex((line) => line.includes('🧠 brain dir'));
  if (head === -1) return '';

  const rows = [lines[head]!];
  for (const line of lines.slice(head + 1)) {
    if (!line.startsWith('   ')) break;
    rows.push(line);
  }
  return rows.join('\n');
};
