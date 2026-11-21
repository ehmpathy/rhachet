/**
 * .what = the file name of a measure's record, from the moment it was taken
 * .why = an iso stamp with every dash, colon and dot stripped sorts by time and carries no dash
 *   clock, so a record path can be cited in a tracked file
 */
export const asMeasureRecordName = (input: { at: Date }): string =>
  `${input.at.toISOString().replace(/[-:.]/g, '')}.json`;
