/**
 * .what = the role specifiers of a declared union that init sends to the linker
 * .why = a native `.this` role is the repo's own, never a package's, so it is never linked;
 *        every other declared role is
 */
export const asRoleSpecifiersToLink = (input: {
  union: { role: string }[];
}): string[] =>
  input.union
    .map((one) => one.role)
    .filter((role) => !role.startsWith('.this/'));
