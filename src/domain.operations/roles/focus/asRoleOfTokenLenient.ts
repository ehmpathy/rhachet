import { ROLE_FOCUS_SEPARATOR } from './asRoleFocusParts';

/**
 * .what = the role a token names, before any `::` focus, with no check of the focus' form
 * .why = a caller that only asks "does this token name a linked role?" must not refuse a
 *        malformed focus itself: it lets the token through, so the delta parser refuses it by
 *        name (`asRoleFocusParts`). the separator stays owned here, beside the strict split
 *
 * .note = `mechanic::flow` → `mechanic`; `mechanic::a::b` → `mechanic`; `mechanic` → `mechanic`
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleOfTokenLenient = (input: { token: string }): string =>
  input.token.split(ROLE_FOCUS_SEPARATOR)[0] ?? '';
