/**
 * .what = the one line enroll prints when the box holds no grove to link
 * .why = an absent grove is no failure — the clone runs on its repo settings alone — but it
 *        is never silent: the line names the path, says the box defaults did not apply, and
 *        names the fix (vision case=4, a ci box that never ran claude by hand)
 */
export const asBrainGroveAbsentLine = (input: {
  groveSource: string;
}): string =>
  `ℹ no grove at ${input.groveSource} — box defaults did not apply; create it to share them with every clone`;
