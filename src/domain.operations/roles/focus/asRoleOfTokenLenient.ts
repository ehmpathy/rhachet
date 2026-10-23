/**
 * .what = the role a token names, before any focus separator, with no check of the focus' form
 * .why = a caller that only asks "does this token name a linked role?" must not refuse a
 *        malformed focus itself: it lets the token through, so the delta parser refuses it by
 *        name (`asRoleFocusParts`)
 *
 * .note = it stops at any run of `:`, so the typo `mechanic:flow` names `mechanic` too. no role
 *         path holds a `:`, so a lone one is never part of a role; were it read as the role, a
 *         bare `+mechanic:flow` would not read as a delta and would reach the brain as text
 * .note = `mechanic::flow` → `mechanic`; `mechanic::a::b` → `mechanic`; `mechanic` → `mechanic`
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleOfTokenLenient = (input: { token: string }): string =>
  input.token.split(/:+/)[0] ?? '';
