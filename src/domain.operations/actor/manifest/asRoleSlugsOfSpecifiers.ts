/**
 * .what = the role slugs a list of role specifiers names — `ehmpathy/mechanic` → `mechanic`
 * .why = a keyrack manifest extends a role by its slug alone; a bare slug passes as is
 */
export const asRoleSlugsOfSpecifiers = (input: {
  specifiers: string[];
}): string[] =>
  input.specifiers.map((specifier) => specifier.split('/').pop() ?? specifier);
