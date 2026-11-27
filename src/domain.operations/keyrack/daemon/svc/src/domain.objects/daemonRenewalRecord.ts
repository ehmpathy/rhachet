import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

/**
 * .what = the status of one grant's renewal, as the daemon holds it
 * .why = `on` takes renews; `lapsed` (the mech's upstream session ended) and `halted` (a
 *        fault held for a full window of ticks, or a code defect at once) take no more,
 *        and stay named in status until a human unlocks, which is the cure for both
 * .note = `off` is never held: it is read at status time, for an `on` entry whose grant
 *         already expires at its max (`asDaemonStatusKey`)
 */
export type DaemonRenewalStatus = 'on' | 'lapsed' | 'halted';

/**
 * .what = what the daemon knows about one grant it renews
 * .why = the store purges a grant on read once it expires, so a grant that expired
 *        while the host slept is gone from the store. the record outlives it, and is
 *        what the renew tick walks
 *
 * .note = an entry is REPLACED, never mutated. the renew's write-back is conditional on
 *         the entry it read: it must still be the one held. so an unlock or a relock
 *         that lands mid-renew always wins — object identity is the check
 */
export interface DaemonRenewalEntry {
  /**
   * .what = the last grant the daemon stored for this address
   */
  grant: KeyrackKeyGrant;

  /**
   * .what = the latest expiry a renewal may give this key, from the unlock
   * .why = a renewal never extends a key past the `--duration` (or maxDuration) the
   *        human chose. once its grant expires at this max, the key ends as it would
   *        with no renewal
   */
  expiresAtMax: IsoTimeStamp;

  status: DaemonRenewalStatus;

  count: {
    /**
     * .what = how many renewals have moved this grant's expiry since its unlock
     */
    renewed: number;

    /**
     * .what = how many ticks in a row the renewal has faulted
     * .why = a blip retries next tick; a full window of faults is a stall, `halted`
     */
    faulted: number;
  };

  /**
   * .what = the cause of a halt, as the fault said it; `null` for every other status
   * .why = a lapse has one known cause; a halt's cause is whatever the error said
   */
  error: string | null;
}

/**
 * .what = in-memory renewal record, keyed by (slug, reach) like the key store
 * .why = holds every grant the daemon renews, apart from the store, so a grant
 *        past its expiry stays renewable and a lapse stays visible past the grant
 */
export const createDaemonRenewalRecord = () => {
  const record = new Map<string, DaemonRenewalEntry>();

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
   * .why = called by UNLOCK. a hand unlock cures a lapse or a halt and restarts the counts
   */
  const set = (input: {
    grant: KeyrackKeyGrant;
    expiresAtMax: IsoTimeStamp;
  }): void => {
    record.set(asAddress(input.grant), {
      grant: input.grant,
      expiresAtMax: input.expiresAtMax,
      status: 'on',
      count: { renewed: 0, faulted: 0 },
      error: null,
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
    before: DaemonRenewalEntry;
    after: DaemonRenewalEntry;
  }): boolean => {
    if (record.get(input.address) !== input.before) return false;
    record.set(input.address, input.after);
    return true;
  };

  /**
   * .what = every entry, with its address
   * .why = the tick writes back through `setIfHeld({ address })`, so each entry it reads
   *        must carry the address it was keyed under
   */
  const entries = (): Array<{ address: string; entry: DaemonRenewalEntry }> =>
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
   * .why = status and unlock read one key's renew by the same slug + reach the store
   *        keys it by, so the two never disagree on which key is meant
   */
  const get = (input: {
    slug: string;
    reach?: KeyrackKeyReach;
  }): DaemonRenewalEntry | null => record.get(asAddress(input)) ?? null;

  /**
   * .what = drop an entry — every reach of a slug, or one named reach
   * .why = mirrors the store's del, so a relock ends renews exactly where it ends
   *        the grant
   * .note = the boolean answers "was any dropped" — a lapsed or halted entry can outlive its
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
   * .why = the tick drops an entry whose max expiry has passed
   */
  const delAt = (input: { address: string }): void => {
    record.delete(input.address);
  };

  /**
   * .what = drop every entry
   * .why = a relock of every key must leave no renew behind, or a later tick would
   *        revive a relocked key
   */
  const clear = (): void => {
    record.clear();
  };

  /**
   * .what = how many entries are held, of any status
   * .why = any entry keeps the daemon alive: an `on` one may be past expiry after a
   *        sleep and owed a renewal; a lapsed or halted one must stay visible until a
   *        human acts
   */
  const size = (): number => record.size;

  return { set, setIfHeld, entries, grants, get, del, delAt, clear, size };
};

/**
 * .what = type for the daemon renewal record instance
 * .why = enables dependency injection in tests
 */
export type DaemonRenewalRecord = ReturnType<typeof createDaemonRenewalRecord>;
