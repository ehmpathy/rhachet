import { DomainLiteral } from 'domain-objects';
import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';
import type { KeyrackHostVault } from './KeyrackHostVault';
import type { KeyrackKey } from './KeyrackKey';
import type { KeyrackKeyReach } from './KeyrackKeyReach';

/**
 * .what = a successfully granted credential with grade
 * .why = bundles key + source + expiration for session cache
 *
 * .note = this is the "payload" — only exists when status is 'granted'
 */
export interface KeyrackKeyGrant {
  /**
   * .what = unique identifier for the key (source slug)
   * .example = 'testorg.all.API_KEY', 'ehmpathy.prod.SECRET'
   *
   * .note = this is the SOURCE slug — shows where the key actually came from
   *         for env=all fallback, this shows .all. so user sees transparency
   * .note = env=all fallback is handled at daemon lookup time, not storage time
   */
  slug: string;

  /**
   * .what = the credential with its grade
   * .why = bundles secret + grade for enforcement
   */
  key: KeyrackKey;

  /**
   * .what = where this grant came from
   * .why = enables audit and debug
   */
  source: {
    vault: KeyrackHostVault;
    mech: KeyrackGrantMechanism;
  };

  /**
   * .what = which env this grant belongs to
   * .why = enables env-based filter (e.g., relock --env sudo)
   * .example = 'sudo', 'prod', 'prep', 'all'
   */
  env: string;

  /**
   * .what = which org this grant belongs to
   * .why = enables org-scoped access and cross-org credentials
   * .example = 'ehmpathy', '@all' (for cross-org)
   */
  org: string;

  /**
   * .what = the external reach this grant opens, when it was cut for one
   * .why = a caller must be able to tell which reach the credential it holds reaches —
   *        two grants of one slug at two reaches are two different credentials
   *
   * .note = `org` above is PROVENANCE (authorized FROM); `reach` is DESTINATION
   *         (authorized INTO). a grant declared by ahbode that opens ehmpathy keeps
   *         `org: ahbode` and carries `reach: { exid: 'github://org=ehmpathy' }` — the
   *         exid is PLAINTEXT, and that one happens to look like a uri only because the
   *         github-app mech imposes that convention on its own exids. an os.secure key
   *         cut per claude account carries `reach: { exid: 'beav@ehmpathy.com' }`
   * .note = OPTIONAL, never nullable — `JSON.stringify` drops an absent field but emits a
   *         null one, so `null` would move every extant json payload and snapshot (e16)
   */
  reach?: KeyrackKeyReach;

  /**
   * .what = when this grant expires
   * .why = enables TTL enforcement in daemon
   * .note = optional; if absent, does not expire
   */
  expiresAt?: IsoTimeStamp;
}

export class KeyrackKeyGrant
  extends DomainLiteral<KeyrackKeyGrant>
  implements KeyrackKeyGrant {}
