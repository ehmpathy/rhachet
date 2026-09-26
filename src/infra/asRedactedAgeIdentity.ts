/**
 * .what = redact the secret material of an age identity for safe display in errors + logs
 * .why  = an age identity string is `AGE-SECRET-KEY-...` secret key material. the derived
 *         unlock identity K must never reach stderr, shell scrollback, ci logs, or a
 *         committed snapshot — that is the whole derive-not-store security promise (K is
 *         never persisted OR exposed, only re-derived). error metadata that lists the
 *         identities it attempted, for diagnostics, must therefore redact the secret and
 *         keep only its non-secret shape ("an age secret key was attempted")
 * .note = a non-age identity (e.g. an ssh key path or the ssh-key-path marker) carries no
 *         age secret, so it passes through unchanged — the diagnostic value (which path was
 *         tried) is preserved, and the path is already visible in the invocation args anyway
 */
export const asRedactedAgeIdentity = (identity: string): string =>
  identity.startsWith('AGE-SECRET-KEY-')
    ? 'AGE-SECRET-KEY-<redacted>'
    : identity;
