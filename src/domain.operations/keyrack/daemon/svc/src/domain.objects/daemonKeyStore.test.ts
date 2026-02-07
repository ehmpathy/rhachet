import { given, then, when } from 'test-fns';

import { createDaemonKeyStore } from './daemonKeyStore';

describe('daemonKeyStore', () => {
  given('[case1] a fresh key store', () => {
    when('[t0] store is created', () => {
      then('size is zero', () => {
        const store = createDaemonKeyStore();
        expect(store.size()).toBe(0);
      });

      then('entries returns empty array', () => {
        const store = createDaemonKeyStore();
        expect(store.entries()).toEqual([]);
      });
    });
  });

  given('[case2] key is stored with valid TTL', () => {
    const store = createDaemonKeyStore();
    const expiresAt = Date.now() + 60000; // 1 minute from now

    beforeEach(() => {
      store.set({
        slug: 'AWS_SSO_PREP',
        key: {
          secret: 'test-secret-123',
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        expiresAt,
      });
    });

    when('[t0] get by slug', () => {
      then('returns the unlocked key', () => {
        const result = store.get({ slug: 'AWS_SSO_PREP' });
        expect(result).not.toBeNull();
        expect(result?.key.secret).toBe('test-secret-123');
      });

      then('has correct grade', () => {
        const result = store.get({ slug: 'AWS_SSO_PREP' });
        expect(result?.key.grade.protection).toBe('encrypted');
        expect(result?.key.grade.duration).toBe('ephemeral');
      });

      then('has correct expiration', () => {
        const result = store.get({ slug: 'AWS_SSO_PREP' });
        expect(result?.expiresAt).toBe(expiresAt);
      });
    });

    when('[t1] get by different slug', () => {
      then('returns null', () => {
        const result = store.get({ slug: 'DIFFERENT_KEY' });
        expect(result).toBeNull();
      });
    });

    when('[t2] entries is called', () => {
      then('returns array with the key', () => {
        const entries = store.entries();
        expect(entries.length).toBe(1);
        expect(entries[0]?.slug).toBe('AWS_SSO_PREP');
      });
    });
  });

  given('[case3] key is stored with expired TTL', () => {
    const store = createDaemonKeyStore();
    const expiresAt = Date.now() - 1000; // 1 second ago (expired)

    beforeEach(() => {
      store.set({
        slug: 'EXPIRED_KEY',
        key: {
          secret: 'expired-secret',
          grade: { protection: 'plaintext', duration: 'permanent' },
        },
        expiresAt,
      });
    });

    when('[t0] get by slug', () => {
      then('returns null (expired key purged)', () => {
        const result = store.get({ slug: 'EXPIRED_KEY' });
        expect(result).toBeNull();
      });

      then('size decreases after read (lazy purge)', () => {
        expect(store.size()).toBe(1); // still in store before read
        store.get({ slug: 'EXPIRED_KEY' }); // triggers purge
        expect(store.size()).toBe(0); // now gone
      });
    });

    when('[t1] entries is called', () => {
      then('returns empty array (expired keys purged)', () => {
        const entries = store.entries();
        expect(entries.length).toBe(0);
      });
    });
  });

  given('[case4] key is deleted', () => {
    const store = createDaemonKeyStore();

    beforeEach(() => {
      store.set({
        slug: 'KEY_TO_DELETE',
        key: {
          secret: 'delete-me',
          grade: { protection: 'encrypted', duration: 'transient' },
        },
        expiresAt: Date.now() + 60000,
      });
    });

    when('[t0] del is called with correct slug', () => {
      then('returns true', () => {
        const result = store.del({ slug: 'KEY_TO_DELETE' });
        expect(result).toBe(true);
      });

      then('key is no longer retrievable', () => {
        store.del({ slug: 'KEY_TO_DELETE' });
        const result = store.get({ slug: 'KEY_TO_DELETE' });
        expect(result).toBeNull();
      });
    });

    when('[t1] del is called with wrong slug', () => {
      then('returns false', () => {
        const result = store.del({ slug: 'NONEXISTENT' });
        expect(result).toBe(false);
      });
    });
  });

  given('[case5] store is cleared', () => {
    const store = createDaemonKeyStore();

    beforeEach(() => {
      store.set({
        slug: 'KEY_1',
        key: {
          secret: 'secret-1',
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        expiresAt: Date.now() + 60000,
      });
      store.set({
        slug: 'KEY_2',
        key: {
          secret: 'secret-2',
          grade: { protection: 'plaintext', duration: 'permanent' },
        },
        expiresAt: Date.now() + 60000,
      });
    });

    when('[t0] clear is called', () => {
      then('size becomes zero', () => {
        expect(store.size()).toBe(2);
        store.clear();
        expect(store.size()).toBe(0);
      });

      then('no keys are retrievable', () => {
        store.clear();
        expect(store.get({ slug: 'KEY_1' })).toBeNull();
        expect(store.get({ slug: 'KEY_2' })).toBeNull();
      });
    });
  });

  given('[case6] key is updated (same slug)', () => {
    const store = createDaemonKeyStore();

    beforeEach(() => {
      store.set({
        slug: 'UPDATABLE_KEY',
        key: {
          secret: 'original-secret',
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        expiresAt: Date.now() + 60000,
      });
    });

    when('[t0] set is called with same slug', () => {
      then('new value replaces old', () => {
        store.set({
          slug: 'UPDATABLE_KEY',
          key: {
            secret: 'updated-secret',
            grade: { protection: 'encrypted', duration: 'transient' },
          },
          expiresAt: Date.now() + 120000,
        });

        const result = store.get({ slug: 'UPDATABLE_KEY' });
        expect(result?.key.secret).toBe('updated-secret');
        expect(result?.key.grade.duration).toBe('transient');
      });
    });
  });
});
