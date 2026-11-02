/**
 * .what = the `🧢 focus` receipt block out of a cli output: its header and its leaves
 * .why = enroll and init both print the block among lines that vary per run (paths, counts),
 *        so a snapshot of the block alone pins its exact render and drifts on naught else
 *
 * .note = returns '' where the output holds no focus block, so a snapshot of an absent block
 *         reads as empty rather than as an error
 */
export const getOneFocusReceiptBlock = (input: { output: string }): string => {
  const lines = input.output.split('\n');
  const start = lines.findIndex((line) => line.trimStart().startsWith('🧢 focus'));
  if (start === -1) return '';

  // the block runs from its header through each leaf, and ends at its closed leaf
  const end = lines.findIndex(
    (line, index) => index > start && line.trimStart().startsWith('└─'),
  );
  return lines.slice(start, end === -1 ? start + 1 : end + 1).join('\n');
};
