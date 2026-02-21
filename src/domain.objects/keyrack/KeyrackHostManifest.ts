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
   * .what = map of key slug to host configuration
   * .why = enables lookup by slug for grant operations
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
