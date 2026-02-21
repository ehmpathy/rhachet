import { DomainLiteral } from 'domain-objects';

/**
 * .what = mechanism for recipient key type
 * .why = supports multiple key types (ssh, yubikey, etc)
 */
export type KeyrackKeyRecipientMech = 'ssh' | 'age' | 'yubikey' | 'passkey';

/**
 * .what = recipient key that can decrypt the host manifest
 * .why = follows age's terminology — encrypts TO recipients, decrypts WITH identities
 */
export interface KeyrackKeyRecipient {
  /**
   * .what = mechanism for this recipient key
   * .example = 'ssh', 'yubikey'
   */
  mech: KeyrackKeyRecipientMech;

  /**
   * .what = public key that can decrypt the manifest
   * .example = 'ssh-ed25519 AAAA...', 'age1yubikey1...'
   */
  pubkey: string;

  /**
   * .what = human-readable label for this recipient
   * .why = enables recipient management (add backup, remove old laptop)
   * .example = 'macbook', 'yubikey-backup', 'desktop'
   */
  label: string;

  /**
   * .what = when this recipient was added
   * .why = audit trail for key management
   */
  addedAt: string;
}

export class KeyrackKeyRecipient
  extends DomainLiteral<KeyrackKeyRecipient>
  implements KeyrackKeyRecipient {}
