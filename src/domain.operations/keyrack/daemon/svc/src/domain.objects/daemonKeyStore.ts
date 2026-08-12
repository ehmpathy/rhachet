import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';
import { getAllKeyrackProbeAddresses } from '@src/domain.operations/keyrack/reach/getAllKeyrackProbeAddresses';

/**
 * .what = a cached grant stored in daemon memory with TTL
 * .why = tracks full grant info with source for audit and debug
 *
 * .note = uses KeyrackKeyGrant directly; ISO timestamp comparison is lexicographic
 */
export type CachedGrant = KeyrackKeyGrant;

/**
 * .what = in-memory key store with TTL enforcement
 * .why = daemon stores credentials in memory only, enforces expiration
 *
 * .note = uses simple Map, not external cache library
 * .note = TTL is enforced on read (get), not via timers
 * .note = keyed by (slug, reach), never by slug alone. two grants of one slug at two
 *         reaches are two credentials; a slug-keyed map would silently evict one with
 *         the other. a reachless grant keys as its bare slug, so no extant entry moves (e1)
 */
export const createDaemonKeyStore = () => {
  const store = new Map<string, CachedGrant>();

  /**
   * .what = store a grant with TTL
   * .why = called by UNLOCK command to cache credentials
   *
   * .note = stores under the grant's full address — its slug AND the reach it opens
   *         env=all fallback is handled at lookup time, not storage time
   */
  const set = (input: { grant: CachedGrant }): void => {
    store.set(
      asKeyrackKeySlugAtReach({
        slug: input.grant.slug,
        reach: input.grant.reach,
      }),
      input.grant,
    );
  };

  /**
   * .what = retrieve a grant by slug and reach, if not expired
   * .why = called by GET command to return credentials
   *
   * .note = purges expired grant on read
   * .note = implements env=all fallback: if org.test.KEY not found, tries org.all.KEY
   * .note = the fallback CARRIES THE REACH ACROSS. were it slug-only, a reach-ask at
   *         org.test.KEY would fall back to the REACHLESS org.all.KEY and hand back a
   *         credential for the wrong reach — the exact silent substitution
   *         reach-as-identity exists to make impossible, reborn one layer down
   */
  const get = (input: {
    slug: string;
    reach?: KeyrackKeyReach;
  }): CachedGrant | null => {
    // helper to check TTL and purge if expired
    const getIfValid = (address: string): CachedGrant | null => {
      const cachedGrant = store.get(address);
      if (!cachedGrant) return null;

      // check TTL (ISO timestamps are lexicographically sortable)
      if (!cachedGrant.expiresAt) return cachedGrant; // no expiration — always valid
      const now = new Date().toISOString();
      if (now >= cachedGrant.expiresAt) {
        // expired — purge and return null
        store.delete(address);
        return null;
      }

      return cachedGrant;
    };

    // the exact address first, then its env=all twin AT THE SAME REACH — the order and
    // its reach-carry invariant live in `getAllKeyrackProbeAddresses`, shared with the
    // manifest lookup and the not-granted status probe
    for (const probe of getAllKeyrackProbeAddresses({
      slug: input.slug,
      reach: input.reach,
    })) {
      const cachedGrant = getIfValid(probe.address);
      if (cachedGrant) return cachedGrant;
    }

    return null;
  };

  /**
   * .what = list all non-expired grants, optionally filtered by env
   * .why = called by STATUS command to show what is unlocked
   *
   * .note = purges expired grants on read
   * .note = if env provided, only returns grants with matched env
   */
  const entries = (input?: { env?: string }): CachedGrant[] => {
    const now = new Date().toISOString();
    const result: CachedGrant[] = [];

    for (const [address, cachedGrant] of store.entries()) {
      const isExpired = cachedGrant.expiresAt && now >= cachedGrant.expiresAt;

      if (isExpired) {
        // expired — purge
        store.delete(address);
      } else {
        // filter by env if provided
        if (input?.env && cachedGrant.env !== input.env) continue;
        result.push(cachedGrant);
      }
    }

    return result;
  };

  /**
   * .what = delete a key — every reach of it, or one named reach
   * .why = called by RELOCK command to purge specific key
   *
   * .note = with NO reach this purges EVERY entry for the slug, across all reaches.
   *         a human who says "lock this key" means the key, not one of its reaches,
   *         and a token that outlived an explicit relock would be a surprise with security
   *         weight. to grant is narrow, to revoke is wide (q1)
   * .note = with a reach it purges exactly that one, which is what a `set` at one reach
   *         needs so it leaves the grants held for every other reach alone
   * .note = the boolean answers "was any purged", so callers keep their extant shape
   */
  const del = (input: { slug: string; reach?: KeyrackKeyReach }): boolean => {
    // a named reach purges exactly one entry
    if (input.reach)
      return store.delete(
        asKeyrackKeySlugAtReach({ slug: input.slug, reach: input.reach }),
      );

    // otherwise sweep every reach of the slug
    // .note = read grant.slug off the VALUE, never parse it back out of the address —
    //         the address is opaque by construction
    const addressesToPurge = [...store.entries()]
      .filter(([, grant]) => grant.slug === input.slug)
      .map(([address]) => address);

    return addressesToPurge
      .map((address) => store.delete(address))
      .some((purged) => purged);
  };

  /**
   * .what = delete all keys
   * .why = called by RELOCK command to purge all keys
   */
  const clear = (): void => {
    store.clear();
  };

  /**
   * .what = check store size (all keys, expired or not)
   * .why = used for status check before cleanup
   */
  const size = (): number => {
    return store.size;
  };

  return {
    set,
    get,
    entries,
    del,
    clear,
    size,
  };
};

/**
 * .what = type for the daemon key store instance
 * .why = enables dependency injection in tests
 */
export type DaemonKeyStore = ReturnType<typeof createDaemonKeyStore>;
