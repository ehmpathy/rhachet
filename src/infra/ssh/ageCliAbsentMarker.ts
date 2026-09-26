/**
 * .what = the stable marker phrase embedded in the "age cli absent" fail-fast
 *         message, so a consumer detects that condition by reference, not a
 *         brittle raw-literal match that a message reword would silently break
 * .why = the passphrased-non-ed25519 fail-fast message (built in both
 *        sshPrikeyToAgeIdentity and initKeyrack) is matched by asAgeIdentityResult
 *        to surface the actionable hint on an explicit --prikey. a bare
 *        `.includes('install age')` would degrade to a null hint the moment the
 *        message is reworded — a silent regression of the errors-name-the-fix
 *        guarantee. one shared constant keeps producer + consumer in lockstep
 *        (rule.require.solve-at-cause)
 * .note = a new producer of this fail-fast message must interpolate this
 *         constant (`${AGE_CLI_ABSENT_MARKER}`) into its text rather than
 *         re-type the literal, so the consumer predicate stays in lockstep
 */
export const AGE_CLI_ABSENT_MARKER = 'install age';
