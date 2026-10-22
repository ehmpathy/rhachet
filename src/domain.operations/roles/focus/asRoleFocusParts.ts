import { ConstraintError } from 'helpful-errors';

/**
 * .what = the separator between a role and its subject focus — `mechanic::flow`
 * .why = `::` is free: no role path splits on `:` (`parseRoleSpecifier` splits on `/` alone),
 *        so the focus rides inside a plain `RoleSlug` string with no schema change
 */
export const ROLE_FOCUS_SEPARATOR = '::';

/**
 * .what = splits a role token into its role and its subject focus
 * .why = hooks follow the role; briefs follow the focus. every site that matches a token
 *        against a linked role must see the two apart, so the split is written once
 *
 * .note = `mechanic` → { role: 'mechanic', subject: null } (the whole role)
 * .note = `ehmpathy/mechanic::flow` → { role: 'ehmpathy/mechanic', subject: 'flow' }
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleFocusParts = (input: {
  token: string;
}): { role: string; subject: string | null } => {
  // no separator → the whole role
  const parts = input.token.split(ROLE_FOCUS_SEPARATOR);
  if (parts.length === 1) return { role: input.token, subject: null };

  // a focus names exactly one role and one subject
  const [role, subject] = parts;
  if (parts.length > 2 || !role || !subject)
    throw new ConstraintError(
      `role focus '${input.token}' must read <role>::<subject>`,
      {
        token: input.token,
        hint: 'name one role and one subject, e.g. mechanic::flow',
      },
    );
  return { role, subject };
};
