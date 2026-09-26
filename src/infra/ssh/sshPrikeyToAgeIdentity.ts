import { BadRequestError } from 'helpful-errors';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { asAgeCliAbsentMessage } from './asAgeCliAbsentMessage';
import { asAgeIdentityFromEd25519Seed } from './asAgeIdentityFromEd25519Seed';
import { asEd25519Seed } from './asEd25519Seed';
import { asFidoUnsupportedKeyError } from './asFidoUnsupportedKeyError';
import { asSshKeyCipher } from './asSshKeyCipher';
import { SSH_KEY_PATH_MARKER } from './asSshKeyPathMarker';
import { asSshKeyTypeFromPrikey } from './asSshKeyTypeFromPrikey';
import { getOneSshKeyUnlockPosture } from './getOneSshKeyUnlockPosture';
import { isAgeCliAvailable } from './isAgeCliAvailable';
/**
 * .what = convert an ed25519 ssh private key to an age identity
 * .why = enables ssh keys to work directly for age encryption/decryption
 *
 * .note = only supports ed25519 keys (not rsa or ecdsa)
 * .note = ed25519 and x25519 share the same curve (Curve25519)
 * .note = conversion: x25519_scalar = SHA-512(ed25519_seed)[:32]
 *
 * .note = for a passphrase-protected NON-ed25519 key (rsa/ecdsa):
 *         returns SSH_KEY_PATH:$absolutePath marker instead of age identity
 *         downstream code (decryptWithIdentity) shells out to age CLI
 * .note = a passphrase-protected ED25519 key is deliberately NOT converted here —
 *         it throws (→ null in the discovery pool) so it is handled EXCLUSIVELY by
 *         the native-dialog Variant A path. see the gate below for why
 * .note = the four-way route decision (passwordless / passphrased-ed25519 /
 *         passphrased-other / fido-unsupported) is the shared
 *         getOneSshKeyUnlockPosture classifier, the SAME one
 *         genKeyrackRecipientSealed and migrateKeyrackManifestToVariantA use —
 *         so this file only interprets the posture, it does not reclassify it
 */
export const sshPrikeyToAgeIdentity = (input: { keyPath: string }): string => {
  const keyContent = readFileSync(input.keyPath, 'utf8');
  const cipher = asSshKeyCipher({ keyContent });
  const keyType = asSshKeyTypeFromPrikey({ keyContent });
  const posture = getOneSshKeyUnlockPosture({ cipher, keyType });
  // a passphrase-protected FIDO/sk- key can serve NONE of the three paths: its
  // private half lives on the hardware token, so ssh-keygen -p cannot strip it and
  // age -d -i cannot decrypt with it, and its signature is non-deterministic so
  // sign-as-KDF is out (vision q4). checked FIRST via the shared posture
  // classifier, so a passwordless FIDO key is caught here too, never handed to
  // asEd25519Seed below. throw a caller-condition
  // -> null in the pool -> it drops out cleanly, so it never hits the marker/age
  // path that would hang or fail with a raw ssh-keygen error. the fix names a key
  // keyrack CAN serve: an ed25519 (sign-as-KDF) or a passphrase-less key (in-process
  // convert). NOT the daemon cache -- it only holds a grant AFTER a successful
  // unlock, so a FIDO-only user can never reach it (rule.require.errors-name-the-fix)
  if (posture === 'fido-unsupported')
    throw asFidoUnsupportedKeyError({
      cipher,
      keyType,
      keyPath: input.keyPath,
    });
  // for unencrypted keys: in-process conversion (no external deps)
  if (posture === 'passwordless') {
    const seed = asEd25519Seed({ keyContent });
    const identity = asAgeIdentityFromEd25519Seed({ seed });
    return identity;
  }
  // a passphrase-protected ed25519 key must NOT take the age-cli marker path. two
  // reasons, both central to the vision: (1) age reads the passphrase from the TTY
  // directly (keylogger-exposed) -- the exact q2 promise this feature exists to keep;
  // (2) under derive-not-store the manifest is sealed to K (an X25519 recipient
  // derived from the agent SIGNATURE), which an ssh key cannot open via age -d -i
  // anyway. so a passphrased ed25519 key belongs to Variant A gnome-dialog path
  // EXCLUSIVELY. throw a caller-condition here -> asAgeIdentityOrNull maps it to
  // null -> it drops out of the prompt-free pool -> genContextKeyrack falls
  // through to Variant A, no tty prompt ever fires. the marker fallback below is
  // reserved for passphrased rsa/ecdsa (vision q4), which Variant A cannot serve
  if (posture === 'passphrased-ed25519')
    throw new BadRequestError(
      `🔐 passphrase-protected ed25519 key — unlocked via the native dialog, not the tty`,
      { cipher, keyPath: input.keyPath },
    );
  // posture === 'passphrased-other': a passphrase-protected non-ed25519 key.
  // check for age CLI, return marker
  if (!isAgeCliAvailable())
    throw new BadRequestError(asAgeCliAbsentMessage({ cipher }), {
      cipher,
      keyPath: input.keyPath,
    });

  // return marker for downstream code to use age CLI
  const absolutePath = resolve(input.keyPath);
  return `${SSH_KEY_PATH_MARKER}${absolutePath}`;
};
