import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';

/**
 * .what = an unlocked key stored in daemon memory with TTL
 * .why = tracks key and expiration for session-time credential cache
 */
export interface UnlockedKey {
  slug: string;
  key: KeyrackKey;
  unlockedAt: number; // timestamp ms
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
  const store = new Map<string, UnlockedKey>();

  /**
   * .what = store a key with TTL
   * .why = called by UNLOCK command to cache credentials
   */
  const set = (input: {
    slug: string;
    key: KeyrackKey;
    expiresAt: number;
  }): void => {
    const unlockedKey: UnlockedKey = {
      slug: input.slug,
      key: input.key,
      unlockedAt: Date.now(),
      expiresAt: input.expiresAt,
    };
    store.set(input.slug, unlockedKey);
  };

  /**
   * .what = retrieve a key by slug if not expired
   * .why = called by GET command to return credentials
   *
   * .note = purges expired key on read
   */
  const get = (input: { slug: string }): UnlockedKey | null => {
    const unlockedKey = store.get(input.slug);
    if (!unlockedKey) return null;

    // check TTL
    const now = Date.now();
    if (now >= unlockedKey.expiresAt) {
      // expired — purge and return null
      store.delete(input.slug);
      return null;
    }

    return unlockedKey;
  };

  /**
   * .what = list all non-expired keys
   * .why = called by STATUS command to show what is unlocked
   *
   * .note = purges expired keys on read
   */
  const entries = (): UnlockedKey[] => {
    const now = Date.now();
    const result: UnlockedKey[] = [];

    for (const [slug, unlockedKey] of store.entries()) {
      if (now >= unlockedKey.expiresAt) {
        // expired — purge
        store.delete(slug);
      } else {
        result.push(unlockedKey);
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
