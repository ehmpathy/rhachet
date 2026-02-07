import { DomainEntity } from 'domain-objects';

import type { KeyrackKeyHost } from './KeyrackKeyHost';

/**
 * .what = machine-level credential storage configuration
 * .why = maps key slugs to their storage locations on this host
 *
 * location: ~/.rhachet/keyrack.manifest.json
 */
export interface KeyrackHostManifest {
  /**
   * .what = canonical path to this manifest file
   * .example = '~/.rhachet/keyrack.manifest.json'
   */
  uri: string;

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
}
