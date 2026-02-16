import type { KeyrackGrantMechanism } from '../../../../../../domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '../../../../../../domain.objects/keyrack/KeyrackHostVault';
import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';

/**
 * .what = a cached grant stored in daemon memory with TTL
 * .why = tracks full grant info with source for audit and debug
 *
 * .note = mirrors KeyrackKeyGrant shape but uses numeric expiresAt for efficient TTL comparison
 */
export interface CachedGrant {
  slug: string;
  key: KeyrackKey;
  source: {
    vault: KeyrackHostVault;
    mech: KeyrackGrantMechanism;
  };
  env: string; // 'sudo' | 'all' | 'prod' | 'prep' | etc
  org: string; // resolved org name (e.g., 'ehmpathy') or '@all' for cross-org
  expiresAt: number; // timestamp ms
}

/**
 * .what = in-memory key store with TTL enforcement
 * .why = daemon stores credentials in memory only, enforces expiration
 *
 * .note = uses simple Map, not external cache library
 * .note = TTL is enforced on read (get), not via timers
 */
export const createDaemonKeyStore = () => {
  const store = new Map<string, CachedGrant>();

  /**
   * .what = store a grant with TTL
   * .why = called by UNLOCK command to cache credentials
   */
  const set = (input: {
    slug: string;
    key: KeyrackKey;
    source: {
      vault: KeyrackHostVault;
      mech: KeyrackGrantMechanism;
    };
    env: string;
    org: string;
    expiresAt: number;
  }): void => {
    const cachedGrant: CachedGrant = {
      slug: input.slug,
      key: input.key,
      source: input.source,
      env: input.env,
      org: input.org,
      expiresAt: input.expiresAt,
    };
    store.set(input.slug, cachedGrant);
  };

  /**
   * .what = retrieve a grant by slug if not expired
   * .why = called by GET command to return credentials
   *
   * .note = purges expired grant on read
   */
  const get = (input: { slug: string }): CachedGrant | null => {
    const cachedGrant = store.get(input.slug);
    if (!cachedGrant) return null;

    // check TTL
    const now = Date.now();
    if (now >= cachedGrant.expiresAt) {
      // expired — purge and return null
      store.delete(input.slug);
      return null;
    }

    return cachedGrant;
  };

  /**
   * .what = list all non-expired grants, optionally filtered by env
   * .why = called by STATUS command to show what is unlocked
   *
   * .note = purges expired grants on read
   * .note = if env provided, only returns grants with matched env
   */
  const entries = (input?: { env?: string }): CachedGrant[] => {
    const now = Date.now();
    const result: CachedGrant[] = [];

    for (const [slug, cachedGrant] of store.entries()) {
      if (now >= cachedGrant.expiresAt) {
        // expired — purge
        store.delete(slug);
      } else {
        // filter by env if provided
        if (input?.env && cachedGrant.env !== input.env) continue;
        result.push(cachedGrant);
      }
    }

    return result;
  };

  /**
   * .what = delete a key by slug
   * .why = called by RELOCK command to purge specific key
   */
  const del = (input: { slug: string }): boolean => {
    return store.delete(input.slug);
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
