/**
 * .what = slices every `🧠 brain://<exid>` treestruct block out of cli stdout — each head
 *   line plus every indented row beneath it, in stdout order, one blank line between two
 *   blocks — and `''` where no such block rendered
 *
 * .why = a brain dir reports as a tree, never as a `boot.md (<label>): …` census line. a
 *   snapshot of whole stdout would drag in every volatile span around it, and a `toContain`
 *   of one row proves naught about the tree's order, glyphs, or words — the three spans a
 *   human actually reads (`rule.require.treestruct-output`)
 *
 * .why EVERY block = `rhx init` and `rhx upgrade` print two trees for one brain dir: the
 *   layout's, before the role inits, then the boot sync's. a slice of the first alone would
 *   drop the boot rows from every lock that reads it
 *
 * .why a SHARED slicer = the upgrade suite and the repo actor migration journey both
 *   assert these blocks, and each would otherwise re-derive the slice inline
 *   (`rule.require.shared-test-fixtures`)
 *
 * .note = an EMPTY return is a real, asserted outcome, never a miss: the report is silent
 *   when the sync changed naught but the corpus render. pair this with a positive assert
 *   on disk, never alone (`rule.forbid.failhide`)
 */
export const asBrainDirReportBlock = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  return lines
    .flatMap((line, index) =>
      line.includes('🧠 brain://')
        ? [getOneTreeFromHead({ lines, head: index })]
        : [],
    )
    .join('\n\n');
};

/**
 * .what = one tree: the head line and the indented rows that follow it
 * .why = a row that does not start with the tree indent ends the tree
 */
const getOneTreeFromHead = (input: { lines: string[]; head: number }): string => {
  const rowsAfter = input.lines.slice(input.head + 1);
  const rowsEnd = rowsAfter.findIndex((line) => !line.startsWith('   '));
  const rows = rowsEnd === -1 ? rowsAfter : rowsAfter.slice(0, rowsEnd);
  return [input.lines[input.head]!, ...rows].join('\n');
};
