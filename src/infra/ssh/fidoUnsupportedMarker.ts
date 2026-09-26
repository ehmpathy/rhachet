/**
 * .what = the stable marker phrase embedded in the "FIDO/hardware-token key is not
 *         supported for keyrack unlock in v1" fail-fast message, so a consumer
 *         detects that condition by reference, not a brittle raw-literal match that
 *         a message reword would silently break
 * .why = the FIDO fail-fast (built in sshPrikeyToAgeIdentity) names an actionable
 *        fix — swap to an ed25519 or passphrase-less key. asAgeIdentityResult must
 *        surface that fix on an explicit --prikey, exactly like the age-cli-absent
 *        hint. without a shared marker, asAgeIdentityResult would drop the FIDO
 *        message to null, and a FIDO user who explicitly named their key would get
 *        the generic "no identity could decrypt … use --prikey" — a misdirect,
 *        since they DID use --prikey and the real fix is to swap the key type
 *        (rule.require.errors-name-the-fix, rule.require.solve-at-cause)
 * .note = a new producer of this fail-fast message must interpolate this constant
 *         (`${FIDO_UNSUPPORTED_MARKER}`) into its text rather than re-type the
 *         literal, so the consumer predicate stays in lockstep
 */
export const FIDO_UNSUPPORTED_MARKER = 'not supported for keyrack unlock in v1';
