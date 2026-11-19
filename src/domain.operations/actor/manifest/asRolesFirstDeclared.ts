import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

/**
 * .what = each role once, kept at its first declaration
 * .why = the union of several actors' roles names the source of the actor that declared the
 *        role first; a later duplicate (by specifier match) is dropped
 */
export const asRolesFirstDeclared = (input: {
  entries: { role: string; via: string | null }[];
}): { role: string; via: string | null }[] =>
  input.entries.filter(
    (one, index, all) =>
      all.findIndex((other) =>
        isRoleSpecifierMatch({ left: other.role, right: one.role }),
      ) === index,
  );
