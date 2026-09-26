import * as age from 'age-encryption';

/**
 * .what = sniff whether an age ciphertext is sealed to a raw ssh recipient (an
 *         `ssh-ed25519` / `ssh-rsa` stanza), rather than an X25519 (`age1…`) recipient
 * .why  = a pre-feature (v0) keyrack manifest made for a passphrase-protected key is
 *         sealed to a raw ssh recipient, openable only by the age-cli tty path. the
 *         Variant A gate routes a passphrased ed25519 key away from that path, so such a
 *         ciphertext can no longer open in-process — the human must re-init to upgrade.
 *         this sniff lets the caller name that exact fix (errors-name-the-fix) instead of
 *         a generic "no identity … use --prikey", which here points at a key that cannot
 *         help. lives in infra (cross-layer) so the access DAO may read it without an
 *         upward import into domain.operations
 *
 * .note = age stanzas live in CLEARTEXT in the binary header (`-> ssh-ed25519 …`), so a
 *         de-armor + header read reveals the recipient TYPE without any identity or
 *         passphrase — a pure inspection, never a decrypt
 * .note = best-effort sniff on an ALREADY-failed decrypt path: a malformed armor returns
 *         false so the caller keeps its generic error. this is not a failhide — the
 *         caller still throws; the sniff only UPGRADES the message when it is confident
 */
export const isAgeCiphertextSshSealed = (input: {
  ciphertext: string;
}): boolean => {
  // de-armor to the binary form whose header carries the recipient stanzas in cleartext;
  // a non-armored or corrupt input cannot be classified, so report false and let the
  // caller surface its generic error unchanged
  let binary: Uint8Array;
  try {
    binary = age.armor.decode(input.ciphertext);
  } catch {
    return false;
  }

  // the age header is utf-8 text up to the payload; the first stanza lines name each
  // recipient TYPE, e.g. `-> ssh-ed25519 <tag> <ephemeral>`. a raw ssh stanza marks a
  // legacy (v0) manifest; an `-> X25519` stanza marks the derive-not-store (v1) shape
  const header = new TextDecoder().decode(binary.slice(0, 512));
  return header.includes('-> ssh-');
};
