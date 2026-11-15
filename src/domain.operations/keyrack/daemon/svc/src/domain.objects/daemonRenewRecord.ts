import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

/**
 * .what = why a renew record stopped to renew its grant
 * .why = a marked record takes no more renews and is named in status until a human
 *        acts. `lapsed` = the portal session ended; `halted` = a fault held for a full
 *        window of ticks. both take the same cure, an unlock
 */
export interface DaemonRenewMark {
  kind: 'lapsed' | 'halted';

  /**
   * .what = the last fault's message, for a halt; `null` for a lapse
   * .why = a lapse has one known cause; a halt's cause is whatever the error said
   */
  error: string | null;
}

/**
 * .what = what the daemon knows about one sso grant it renews
 * .why = the store purges a grant on read once it expires, so a grant that expired
 *        while the host slept is gone from the store. the record outlives it, and is
 *        what the renew tick walks
 *
 * .note = an entry is REPLACED, never mutated. the renew's write-back is conditional on
 *         the entry it read: it must still be the one held. so an unlock or a relock
 *         that lands mid-renew always wins — object identity is the check
 */
export interface DaemonRenewEntry {
  /**
   * .what = the last grant the daemon stored for this address
   */
  grant: KeyrackKeyGrant;

  /**
   * .what = the human's bound on this key's life, from the unlock
   * .why = a renew never extends a key past the `--duration` (or maxDuration) the
   *        human chose. at the cap, the key expires as it would with no renew
   */
  capAt: IsoTimeStamp;

  /**
   * .what = how many renews have moved this grant's expiry since its unlock
   */
  renewedCount: number;

  /**
   * .what = how many ticks in a row the renew has faulted
   * .why = a blip retries next tick; 10 in a row is a stall, marked `halted`
   */
  faultCount: number;

  mark: DaemonRenewMark | null;
}

/**
 * .what = in-memory renew record, keyed by (slug, reach) like the key store
 * .why = holds every sso grant the daemon renews, apart from the store, so a grant
 *        past its expiry stays renewable and a lapse stays visible past the grant
 */
export const createDaemonRenewRecord = () => {
  const record = new Map<string, DaemonRenewEntry>();

  /**
   * .what = the address an entry is filed under
   */
  const asAddress = (input: {
    slug: string;
    reach?: KeyrackKeyReach;
  }): string =>
    asKeyrackKeySlugAtReach({ slug: input.slug, reach: input.reach });

  /**
   * .what = file a fresh entry for a grant, which replaces any prior one
   * .why = called by UNLOCK. a hand unlock cures a mark and restarts the count
   */
  const set = (input: {
    grant: KeyrackKeyGrant;
    capAt: IsoTimeStamp;
  }): void => {
    record.set(asAddress(input.grant), {
      grant: input.grant,
      capAt: input.capAt,
      renewedCount: 0,
      faultCount: 0,
      mark: null,
    });
  };

  /**
   * .what = swap in a new entry only if the entry read is still the one held
   * .why = the renew's write-back. an unlock or relock mid-renew replaced or removed
   *        the entry, and its answer must win
   * .note = the boolean answers "was it written"
   */
  const setIfHeld = (input: {
    address: string;
    before: DaemonRenewEntry;
    after: DaemonRenewEntry;
  }): boolean => {
    if (record.get(input.address) !== input.before) return false;
    record.set(input.address, input.after);
    return true;
  };

  /**
   * .what = every entry, with its address
   */
  const entries = (): Array<{ address: string; entry: DaemonRenewEntry }> =>
    [...record.entries()].map(([address, entry]) => ({ address, entry }));

  /**
   * .what = the grant of every entry, optionally of one env
   * .why = mirrors the store's `entries({ env })`, so a relock sweeps both alike
   */
  const grants = (input?: { env?: string }): KeyrackKeyGrant[] =>
    [...record.values()]
      .map((entry) => entry.grant)
      .filter((grant) => !input?.env || grant.env === input.env);

  /**
   * .what = the entry for one address, if any
   */
  const get = (input: {
    slug: string;
    reach?: KeyrackKeyReach;
  }): DaemonRenewEntry | null => record.get(asAddress(input)) ?? null;

  /**
   * .what = drop an entry — every reach of a slug, or one named reach
   * .why = mirrors the store's del, so a relock ends renews exactly where it ends
   *        the grant
   * .note = the boolean answers "was any dropped" — a marked entry can outlive its
   *         grant, so a relock must count it even where the store held naught
   */
  const del = (input: { slug: string; reach?: KeyrackKeyReach }): boolean => {
    // a named reach drops exactly one entry
    if (input.reach) return record.delete(asAddress(input));

    // otherwise sweep every reach of the slug
    const addressesToDrop = [...record.entries()]
      .filter(([, entry]) => entry.grant.slug === input.slug)
      .map(([address]) => address);
    return addressesToDrop
      .map((address) => record.delete(address))
      .some((dropped) => dropped);
  };

  /**
   * .what = drop the entry at one exact address
   * .why = the tick drops an entry whose cap has passed
   */
  const delAt = (input: { address: string }): void => {
    record.delete(input.address);
  };

  /**
   * .what = drop every entry
   */
  const clear = (): void => {
    record.clear();
  };

  /**
   * .what = how many entries are held, marked or not
   * .why = any entry keeps the daemon alive: an active one may be past expiry after a
   *        sleep and owed a renew; a marked one must stay visible until a human acts
   */
  const size = (): number => record.size;

  return { set, setIfHeld, entries, grants, get, del, delAt, clear, size };
};

/**
 * .what = type for the daemon renew record instance
 * .why = enables dependency injection in tests
 */
export type DaemonRenewRecord = ReturnType<typeof createDaemonRenewRecord>;
