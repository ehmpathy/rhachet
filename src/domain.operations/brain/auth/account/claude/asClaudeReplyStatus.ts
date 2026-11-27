/**
 * .what = the outcome of one claude oauth call, read from its http status
 * .why = `get` shows each account's status (case=5, case=11); one table decides it for every call
 */
export type ClaudeReplyStatus = 'ok' | 'dead' | 'rate-limited' | 'unreadable';

/**
 * .what = classify a claude oauth http status
 * .why = a mint and a read fail in different ways: a mint refused (4xx) means the refresh token is
 *   spent or revoked, so the account is dead; a read refused with 401 means the access token
 *   lapsed, which is dead for the read at hand
 * .note
 *   - 200 → ok
 *   - 429 → rate-limited, on either call
 *   - 5xx, or a 3xx (redirects are never followed) → unreadable; a retry may help
 *   - mint, any other status → dead
 *   - read, 401 or 403 → dead; any other status → unreadable
 */
export const asClaudeReplyStatus = (input: {
  call: 'mint' | 'read';
  httpStatus: number;
}): ClaudeReplyStatus => {
  // a success
  if (input.httpStatus === 200) return 'ok';

  // a throttle, which a later attempt clears
  if (input.httpStatus === 429) return 'rate-limited';

  // a fault upstream, or a redirect we refuse to follow
  if (
    input.httpStatus >= 500 ||
    (input.httpStatus >= 300 && input.httpStatus < 400)
  )
    return 'unreadable';

  // a mint refused: the refresh token no longer opens the account
  if (input.call === 'mint') return 'dead';

  // a read refused for its credential
  if (input.httpStatus === 401 || input.httpStatus === 403) return 'dead';
  return 'unreadable';
};
