/**
 * .what = the scopes a token reply grants, as a list
 * .why = the reply carries them as one space-joined string; claude's login file stores a list
 * .note = an absent or non-string scope reads as no scopes, never a fault: the swap does not rest
 *   on them
 */
export const asClaudeOauthScopes = (input: { scope: unknown }): string[] =>
  typeof input.scope === 'string'
    ? input.scope.split(' ').filter((scope) => scope.length > 0)
    : [];
