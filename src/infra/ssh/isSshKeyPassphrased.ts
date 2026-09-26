import { asSshKeyCipher } from './asSshKeyCipher';

/**
 * .what = whether an openssh private key is passphrase-protected (encrypted)
 * .why  = a passphrased key pops the native dialog on load; a passphrase-less one
 *         loads silently. the headless guard needs this distinction: a passphrase
 *         -less key unlocks fine on a headless box (ssh-add needs no dialog), so
 *         only a PASSPHRASED key on a headless box warrants the distinct fail-fast
 *
 * .note = pure over key content, so it is unit-testable with no filesystem
 * .note = cipher 'none' = unencrypted (no passphrase); any other cipher name
 *         (e.g. 'aes256-ctr') = passphrase-protected
 */
export const isSshKeyPassphrased = (input: { keyContent: string }): boolean =>
  asSshKeyCipher({ keyContent: input.keyContent }) !== 'none';
