/**
 * .what = the stop hold as one tree: one `🧢` root, each drift readout a branch section below it
 * .why = one invocation heads one frame. a stop that holds on two drifts at once (a boot past its
 *        cap and a content defect) would otherwise print the invocation twice, which reads as a
 *        restart or a second run
 *
 * .note = each readout renders as its own tree (header, body, a final blank line). the header is
 *   dropped from each, and every body but the last is reopened: its final `└─` branch becomes
 *   `├─`, and the lines nested under that branch take the `│` spine, so the next body attaches
 * .note = a single readout renders byte for byte as it did alone
 */
export const asRoleCostHookHoldLines = (input: {
  invocation: string;
  readouts: string[][];
}): string[] => {
  const bodies = input.readouts.map((readout) => asReadoutBody({ readout }));
  return [
    `🧢 ${input.invocation}`,
    ...bodies.flatMap((body, index) =>
      index === bodies.length - 1
        ? body
        : [...asBodyReopened({ body }), '   │'],
    ),
    '',
  ];
};

/**
 * .what = the lines of a readout below its header, less its final blank line
 * .why = names the two trims, so the composer reads as the join it is
 */
const asReadoutBody = (input: { readout: string[] }): string[] => {
  const body = input.readout.slice(1);
  return body[body.length - 1] === '' ? body.slice(0, -1) : body;
};

/**
 * .what = the index of a body's final top-level `└─` branch, or -1
 * .why = names the search the reopen pivots on
 */
const getOneIndexOfFinalBranch = (input: { body: string[] }): number =>
  input.body.reduce(
    (found, line, index) => (line.startsWith('   └─') ? index : found),
    -1,
  );

/**
 * .what = a body whose final top-level branch is reopened, so a peer section can follow it
 * .why = a `└─` ends the root; a body with a section after it must end on `├─` instead, and the
 *        lines nested under that branch must carry the `│` spine down to the next section
 */
const asBodyReopened = (input: { body: string[] }): string[] => {
  const indexFinal = getOneIndexOfFinalBranch({ body: input.body });
  if (indexFinal === -1) return input.body;
  return input.body.map((line, index) => {
    if (index < indexFinal) return line;
    if (index === indexFinal) return `   ├─${line.slice('   └─'.length)}`;
    if (line === '') return '   │';
    return `   │  ${line.slice('      '.length)}`;
  });
};
