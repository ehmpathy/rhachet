import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

/**
 * .what = a base actor's roles with `+role` / `-role` deltas applied
 * .why = names the base ⊕ delta math, so the expander reads as find → expand base → apply deltas
 *
 * .note = a `+role` the base already holds adds no second copy
 * .note = a `-role` the base does not hold yields a warn line, never a refusal — the base may
 *         have dropped it since the extension was written
 */
export const asActorRolesWithDeltas = (input: {
  ref: string;
  base: { ref: string; roles: string[] };
  deltas: string[];
}): { rolesKept: string[]; rolesAdded: string[]; warnings: string[] } => {
  // split the deltas by sigil
  const additions = input.deltas
    .filter((one) => one.startsWith('+'))
    .map((one) => one.slice(1));
  const subtractions = input.deltas
    .filter((one) => one.startsWith('-'))
    .map((one) => one.slice(1));

  // keep each base role no subtraction names, then add each addition not already kept
  const rolesKept = input.base.roles.filter(
    (role) =>
      !subtractions.some((minus) =>
        isRoleSpecifierMatch({ left: role, right: minus }),
      ),
  );
  const rolesAdded = additions.filter(
    (plus) =>
      !rolesKept.some((role) =>
        isRoleSpecifierMatch({ left: role, right: plus }),
      ),
  );

  // warn on each subtraction the base never held
  const warnings = subtractions
    .filter(
      (minus) =>
        !input.base.roles.some((role) =>
          isRoleSpecifierMatch({ left: role, right: minus }),
        ),
    )
    .map(
      (minus) =>
        `${input.ref} removes -${minus}, which ${input.base.ref} does not hold`,
    );

  return { rolesKept, rolesAdded, warnings };
};
