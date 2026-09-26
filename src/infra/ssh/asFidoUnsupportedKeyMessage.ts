import { FIDO_UNSUPPORTED_MARKER } from './fidoUnsupportedMarker';

/**
 * .what = the pure human-read body of the "FIDO/hardware-token key is unsupported
 *         in v1" fail-fast — the message string ALONE, with no error-class prefix and
 *         no serialized metadata
 * .why = two surfaces need the SAME copy: the thrown BadRequestError
 *        (asFidoUnsupportedKeyError) AND the re-wrap hint asAgeIdentityResult hands to
 *        genContextKeyrack. if the hint reused the thrown error's `.message`,
 *        HelpfulError would have baked `BadRequestError: ` + the metadata JSON into
 *        it, so the outer ConstraintError re-wrap rendered a DOUBLE class
 *        (`✋ ConstraintError: BadRequestError:`) and a DOUBLE context block. the body
 *        kept here as a pure string lets each surface wrap it once — a single class,
 *        a single context (rule.forbid.snapshot-visual-blemishes)
 *
 * .note = interpolates FIDO_UNSUPPORTED_MARKER so isFidoUnsupportedError stays in
 *         lockstep with the copy
 * .note = the fix names a key keyrack CAN serve (ed25519 or passphrase-less), never
 *         the daemon cache — it only holds a grant AFTER a successful unlock, which a
 *         FIDO-only user never reaches (rule.require.errors-name-the-fix)
 */
export const asFidoUnsupportedKeyMessage = (input: {
  keyType: string;
}): string =>
  `🔐 passphrase-protected FIDO/hardware-token key (${input.keyType}) — ${FIDO_UNSUPPORTED_MARKER}.
   ├─ why: its private half stays on the security key, so it cannot back the
   │       ssh-agent unlock
   └─ fix: init the keyrack with a key keyrack can unlock — an ed25519 key
           (passphrased is fine — the native dialog unlocks it), or a
           passphrase-less key. then retry:
           rhx keyrack init --prikey <path-to-that-key>`;
