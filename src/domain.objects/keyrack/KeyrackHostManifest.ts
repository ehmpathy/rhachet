import { DomainEntity, DomainLiteral } from 'domain-objects';

import type { KeyrackKeyHost } from './KeyrackKeyHost';
import type { KeyrackKeyRecipient } from './KeyrackKeyRecipient';

/**
 * .what = machine-level credential storage configuration
 * .why = maps key slugs to their storage locations on this host
 *
 * location:
 *   - default: ~/.rhachet/keyrack/keyrack.host.age
 *   - per-owner: ~/.rhachet/keyrack/keyrack.host.${owner}.age
 *
 * .note = encrypted to recipient keys (ssh, yubikey, etc)
 */
export interface KeyrackHostManifest {
  /**
   * .what = canonical path to this manifest file
   * .example = '~/.rhachet/keyrack/keyrack.host.age'
   */
  uri: string;

  /**
   * .what = owner of this manifest (null for default, explicit name for robot)
   * .why = enables per-owner isolation (mechanic, foreman each have own manifest)
   * .example = null (default), 'mechanic', 'foreman'
   */
  owner: string | null;

  /**
   * .what = recipient keys that can decrypt this manifest
   * .why = enables multi-machine access and backup keys
   */
  recipients: KeyrackKeyRecipient[];

  /**
   * .what = map of key address to host configuration
   * .why = enables lookup for grant operations
   *
   * .note = the address is `asKeyrackKeySlugAtReach({ slug, reach })`, NOT the bare slug.
   *         a key cut for no reach addresses as its bare slug, byte for byte — so every
   *         manifest written before reach existed parses and re-serializes unchanged (e1).
   *         only a key cut for a reach takes the composite form
   * .note = a slug-keyed map could not hold two reaches of one slug; one would silently
   *         evict the other, which is the exact failure reach-as-identity exists to prevent
   */
  hosts: Record<string, KeyrackKeyHost>;
}

export class KeyrackHostManifest
  extends DomainEntity<KeyrackHostManifest>
  implements KeyrackHostManifest
{
  public static unique = ['uri'] as const;
  public static nested = {
    recipients: DomainLiteral,
  };
}
