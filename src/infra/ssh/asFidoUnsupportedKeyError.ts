import { BadRequestError } from 'helpful-errors';

import { asFidoUnsupportedKeyMessage } from './asFidoUnsupportedKeyMessage';

/**
 * .what = build the one canonical "FIDO/hardware-token key is unsupported" error
 * .why = a passphrase-protected sk- key can back NONE of the unlock paths, so both
 *        init (genKeyrackRecipientSealed) and unlock-discovery (sshPrikeyToAgeIdentity)
 *        must reject it with the SAME message + fix. the copy lives ONCE in the pure
 *        asFidoUnsupportedKeyMessage builder, which the re-wrap hint path also reuses
 *        so a single class + single context render (no drift, no doubled prefix)
 *
 * .note = the message names a key keyrack CAN serve (ed25519 or passphrase-less), per
 *         rule.require.errors-name-the-fix. the daemon cache is NOT offered: it only
 *         holds a grant AFTER a successful unlock, which a FIDO-only user never reaches
 */
export const asFidoUnsupportedKeyError = (input: {
  cipher: string;
  keyType: string;
  keyPath: string;
}) =>
  new BadRequestError(asFidoUnsupportedKeyMessage({ keyType: input.keyType }), {
    cipher: input.cipher,
    keyType: input.keyType,
    keyPath: input.keyPath,
  });
