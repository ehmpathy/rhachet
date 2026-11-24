/**
 * .what = the error texts each sso proof gate reads as "the portal session ended"
 * .why = a session end is a `lapse` (one mark, a hand unlock cures it); every other
 *        error is a fault the caller retries. the line between them lives here, named,
 *        so a reader never has to simulate an inline `||` chain to see it
 *
 * .note = matched on the lowercased text. the sdk gate reads only the sentences the sdk
 *         writes for a dead session: its `CredentialsProviderError` also wraps a network,
 *         throttle, or 5xx failure of `GetRoleCredentials`, so the class name alone would
 *         read a blip as a lapse
 * .note = an `sso_session` profile reaches `@aws-sdk/token-providers`, whose every
 *         session-end sentence (an expired token, an absent cache, no refresh token) ends
 *         in its refresh hint, and whose config faults do not; so the hint is the needle
 * .note = the cli gate reads the child's stderr, never the exec message: the message
 *         carries the argv, so a profile named `*expired*` would read every failure as a
 *         lapse
 */
const SESSION_ENDED_TEXTS = {
  fromSSO: [
    'to refresh this sso session run',
    'sso session associated with this profile has expired',
    'sso session associated with this profile is invalid',
    'session token not found or invalid',
  ],
  'export-credentials': [
    'expired',
    'otherwise invalid',
    'unauthorized',
    'does not exist',
  ],
} as const;

/**
 * .what = is this value shaped as an error: an object with a string message?
 * .why = read by shape, never by `instanceof Error`: an exec error is built in node's own
 *        realm, so a host with a second realm (a jest sandbox, a vm) holds an `Error` class
 *        it is no instance of, and a session end would read as a fault
 */
const isErrorShaped = (
  value: unknown,
): value is { message: string; stderr?: unknown } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { message?: unknown }).message === 'string';

/**
 * .what = the text a gate's error is read by
 * .why = the cli gate's error carries the child's stderr; the sdk gate's, a message
 */
const asGateErrorText = (input: {
  gate: keyof typeof SESSION_ENDED_TEXTS;
  error: { message: string; stderr?: unknown };
}): string => {
  const stderr = input.error.stderr;
  if (input.gate === 'export-credentials' && typeof stderr === 'string')
    return stderr.toLowerCase();
  return input.error.message.toLowerCase();
};

/**
 * .what = does this gate error say the sso portal session ended?
 * .why = the proof answers `{ live: false }` only for a session end, and throws any
 *        other error, so a blip is never read as a lapse
 */
export const isAwsSsoSessionEndedError = (input: {
  gate: keyof typeof SESSION_ENDED_TEXTS;
  error: unknown;
}): boolean => {
  if (!isErrorShaped(input.error)) return false;
  const text = asGateErrorText({ gate: input.gate, error: input.error });
  return SESSION_ENDED_TEXTS[input.gate].some((ended) => text.includes(ended));
};
