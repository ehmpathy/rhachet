/**
 * .what = a text file's content, with each `linesAbsent` line dropped and each
 *         `linesPresent` line appended where no line equals it
 * .why = one pure pass for a whole set of line edits, so the caller writes the file once —
 *        never a chain of read-modify-writes that a concurrent writer could interleave
 *
 * .note = the set-grain twin of `findsertFileLine`, with its exact semantics for each
 *   append: every other line, and every line break, comes back byte for byte; an append
 *   first adds a newline if the last line lacks one; absent content (`null`) starts empty
 * .note = `linesPresent` append in the order given, so an allowlist's `/*` precedes its
 *   `!` re-includes
 */
export const asTextWithLinesConverged = (input: {
  content: string | null;
  linesAbsent: string[];
  linesPresent: string[];
}): string => {
  const linesAbsent = new Set(input.linesAbsent);
  const contentKept = (input.content ?? '')
    .split('\n')
    .filter((line) => !linesAbsent.has(line))
    .join('\n');
  return input.linesPresent.reduce((content, line) => {
    if (content.split('\n').includes(line)) return content;
    const prefix =
      content === '' || content.endsWith('\n') ? content : `${content}\n`;
    return `${prefix}${line}\n`;
  }, contentKept);
};
