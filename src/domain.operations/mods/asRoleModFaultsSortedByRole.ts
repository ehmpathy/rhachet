/**
 * .what = the code-point order of two strings, as a sort comparator
 * .why = the same order a bare `.sort()` gives a list of slugs; `localeCompare` would follow the
 *        host's collation, so one input could render two orders on two hosts
 */
const asCodePointOrder = (input: { a: string; b: string }): number => {
  if (input.a < input.b) return -1;
  if (input.a > input.b) return 1;
  return 0;
};

/**
 * .what = mod faults in code-point order of their role
 * .why = each readout that names mod faults (the render, the stop hold) prints them in one order
 *        on every host, whatever order the fs walk met them in
 */
export const asRoleModFaultsSortedByRole = <
  TFault extends { role: string },
>(input: {
  faults: TFault[];
}): TFault[] =>
  [...input.faults].sort((a, b) => asCodePointOrder({ a: a.role, b: b.role }));
