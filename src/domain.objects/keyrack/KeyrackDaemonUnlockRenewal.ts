import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyReach } from './KeyrackKeyReach';

/**
 * .what = one key's opt-in to renew, as it crosses the socket on UNLOCK
 * .why = the stored `expiresAt` is already min(cap, the role creds' expiry), so the
 *        cap would be lost at unlock. the cli that knows the human's bound sends it
 *        to the daemon, per key, so a renew can never outlive that bound
 *
 * .note = a wire contract: the sdk sends it, the daemon reads it. it lives beside
 *         `KeyrackDaemonCommand`, so neither side reaches into the other's internals
 * .note = `reach` is optional on the wire: json drops an absent field, and a key with
 *         no reach is the common case
 */
export interface KeyrackDaemonUnlockRenewal {
  slug: string;
  reach?: KeyrackKeyReach;

  /**
   * .what = the latest moment a renew may extend this key to
   * .note = min(requested duration, maxDuration) from the unlock moment
   */
  capAt: IsoTimeStamp;
}
