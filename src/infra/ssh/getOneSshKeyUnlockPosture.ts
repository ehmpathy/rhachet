import { isFidoSshKeyType } from './isFidoSshKeyType';

/**
 * .what = the four unlock paths an ssh key can take: in-process convert
 *         (passwordless), the native-dialog sign-as-kdf (passphrased ed25519), the
 *         age-cli fallback (passphrased rsa/ecdsa), or none at all (a FIDO/sk- key)
 */
export type SshKeyUnlockPosture =
  | 'passwordless'
  | 'passphrased-ed25519'
  | 'passphrased-other'
  | 'fido-unsupported';

/**
 * .what = classify which unlock path an ssh key takes, from its cipher + type
 * .why = this four-way read was independently re-assembled at three call sites
 *        (sshPrikeyToAgeIdentity, genKeyrackRecipientSealed,
 *        migrateKeyrackManifestToVariantA), each combining
 *        asSshKeyCipher/asSshKeyTypeFromPrikey/asSshKeyTypeFromPubkey +
 *        isFidoSshKeyType + an ed25519 equality check by hand -- a drift-prone
 *        triplication (i054 nitpick 1). the three sites read from different input
 *        shapes (a prikey buffer, a pubkey line, a cipher+pubkey pair already in
 *        hand), so each derives its own local {cipher, keyType} via the
 *        ALREADY-shared token reads (asSshKeyTypeFromPubkey/asSshKeyTypeFromPrikey)
 *        and feeds that pair into this ONE classifier -- the four-way decision now
 *        lives in exactly one place
 *
 * .note = FIDO classifies FIRST, before cipher: a FIDO/sk- key private half never
 *         touches disk (it lives on the hardware token) even for a passwordless
 *         (resident) key -- so a passwordless sk- key is still fido-unsupported,
 *         never passwordless. mirrors genKeyrackRecipientSealed extant FIDO-first
 *         order; sshPrikeyToAgeIdentity previously checked cipher first, which would
 *         have sent a passwordless FIDO key into the raw ed25519-seed parse instead
 *         of this clean classification -- this closes that gap
 * .note = ed25519 classifies by STRICT equality (ssh-ed25519), not a prefix -- a
 *         FIDO ed25519 variant (sk-ssh-ed25519@openssh.com) never false-positives
 *         as plain ed25519 even absent the FIDO branch above it (belt + suspenders,
 *         the same invariant isEd25519Pubkey documents)
 */
export const getOneSshKeyUnlockPosture = (input: {
  cipher: string;
  keyType: string;
}): SshKeyUnlockPosture => {
  if (isFidoSshKeyType({ keyType: input.keyType })) return 'fido-unsupported';
  if (input.cipher === 'none') return 'passwordless';
  if (input.keyType === 'ssh-ed25519') return 'passphrased-ed25519';
  return 'passphrased-other';
};
