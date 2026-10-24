import { ConstraintError } from 'helpful-errors';

import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';

/**
 * .what = refuses a focus on `rhx upgrade --roles`
 * .why = upgrade's `--roles` names packages to upgrade, and a package has no focus. every actor
 *        focused on a role re-renders at its own focus when the package moves, so the refusal
 *        names the package form as the fix (fulcrum F7)
 *
 * .note = a malformed focus (`mechanic::`) refuses here too, through the one parser
 */
export const assertUpgradeRoleSpecsUnfocused = (input: {
  roleSpecs: string[];
}): void => {
  // the first spec that names a focus, if any
  const focused = input.roleSpecs
    .map((spec) => ({ spec, ...asRoleFocusParts({ token: spec }) }))
    .find((parts) => parts.subject !== null);

  // every spec names a package alone, which is what upgrade moves
  if (!focused) return;

  // a focus names no package; name the package form as the fix
  throw new ConstraintError(
    `upgrade --roles names packages, and a package has no focus: '${focused.spec}'`,
    {
      roleSpecs: input.roleSpecs,
      hint: `run: rhx upgrade --roles ${focused.role} — every actor focused on it re-renders at its own focus`,
    },
  );
};
