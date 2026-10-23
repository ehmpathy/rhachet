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
  // a lone `:` is a typo of `::`. no role path holds a `:`, so it never names a role, and the
  //   nearest-role suggestion would steer the caller to the whole role the focus was meant to shed
  const parts = input.token.split(ROLE_FOCUS_SEPARATOR);
  if (parts.length === 1 && input.token.includes(':'))
    throw new ConstraintError(
      `role focus '${input.token}' has one colon; a focus is written <role>::<subject>`,
      {
        token: input.token,
        hint: `write ${input.token.replace(/:+/, ROLE_FOCUS_SEPARATOR)}`,
      },
    );

  // no separator → the whole role
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
