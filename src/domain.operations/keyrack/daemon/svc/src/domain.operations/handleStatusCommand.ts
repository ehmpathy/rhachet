import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

/**
 * .what = handle STATUS command to list unlocked keys with TTL left
 * .why = shows what credentials are available and when they expire
 *
 * .note = includes homeHash for daemon identity (usecase.5 observability)
 */
export const handleStatusCommand = (
  _input: Record<string, never>,
  context: {
    keyStore: DaemonKeyStore;
    homeHash: string;
  },
): {
  homeHash: string;
  keys: Array<{
    slug: string;
    env: string;
    org: string;
    reach?: KeyrackKeyReach;
    expiresAt: IsoTimeStamp | null;

    /**
     * .what = milliseconds until this grant dies — `null` when it never does
     * .note = ⚠️ this yielded `Infinity` until 2026-08-06, and the socket is JSON:
     *         `JSON.stringify(Infinity)` is the string `"null"`. so the value a client
     *         received was ALREADY `null` while both sides declared `number`, and
     *         `Math.round(null / 1000 / 60)` is `0` — a key that never expires rendered as
     *         `expires in: 0m`, which reads as ALREADY DEAD
     * .note = a no-expiry key is a first-class state here, not a corner: `daemonKeyStore`
     *         reads an absent `expiresAt` as "no expiration — always valid" and `entries()`
     *         hands it straight to this map
     */
    ttlLeftMs: number | null;
  }>;
} => {
  const now = Date.now();

  // .note = entries() yields one row per (slug, reach), which is exactly right here: the
  //         rack IS the answer to "which reaches can this repo touch". the same call
  //         needs its rows COLLAPSED for relock, which reports per key — see the dedupe
  //         there. one sweep, two consumers, two opposite needs
  const allKeys = context.keyStore.entries();

  const keys = allKeys.map((unlockedKey) => ({
    slug: unlockedKey.slug,
    env: unlockedKey.env,
    org: unlockedKey.org,
    ...asKeyrackKeyReachField({ reach: unlockedKey.reach }),
    expiresAt: unlockedKey.expiresAt ?? null,
    // `null`, never `Infinity` — the wire is JSON, which cannot carry `Infinity` and
    // silently rewrites it to `null`. to send `null` outright makes the declared type
    // true on BOTH sides of the socket rather than only on this one
    ttlLeftMs: unlockedKey.expiresAt
      ? Math.max(0, new Date(unlockedKey.expiresAt).getTime() - now)
      : null,
  }));

  return { homeHash: context.homeHash, keys };
};
