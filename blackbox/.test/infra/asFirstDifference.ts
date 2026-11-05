/**
 * .what = the first char at which two strings part, with each side around it
 * .why = a byte-equal clamp that fails must name the byte, not just say "differs":
 *        the offset and both values let a maintainer see the leak at a glance
 * .note = null when the two are equal
 */
export const asFirstDifference = (input: {
  before: string;
  after: string;
  radius: number;
}): { offset: number; before: string; after: string } | null => {
  // equal strings have no difference to name
  if (input.before === input.after) return null;

  // walk to the first char that differs; a prefix ends at the shorter length
  const lengthShared = Math.min(input.before.length, input.after.length);
  const offsetFound = Array.from({ length: lengthShared }).findIndex(
    (_, index) => input.before[index] !== input.after[index],
  );
  const offset = offsetFound === -1 ? lengthShared : offsetFound;

  // each side, around the offset
  const start = Math.max(0, offset - input.radius);
  return {
    offset,
    before: input.before.slice(start, offset + input.radius),
    after: input.after.slice(start, offset + input.radius),
  };
};
