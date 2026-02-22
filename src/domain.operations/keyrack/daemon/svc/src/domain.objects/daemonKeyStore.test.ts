import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

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
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

    beforeEach(() => {
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'AWS_SSO_PREP',
          key: {
            secret: 'test-secret-123',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prep',
          org: 'ehmpathy',
          expiresAt,
        }),
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

      then('has correct env and org', () => {
        const result = store.get({ slug: 'AWS_SSO_PREP' });
        expect(result?.env).toBe('prep');
        expect(result?.org).toBe('ehmpathy');
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
    const expiresAt = asIsoTimeStamp(new Date(Date.now() - 1000));

    beforeEach(() => {
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'EXPIRED_KEY',
          key: {
            secret: 'expired-secret',
            grade: { protection: 'plaintext', duration: 'permanent' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'all',
          org: 'ehmpathy',
          expiresAt,
        }),
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
        grant: new KeyrackKeyGrant({
          slug: 'KEY_TO_DELETE',
          key: {
            secret: 'delete-me',
            grade: { protection: 'encrypted', duration: 'transient' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prod',
          org: 'ehmpathy',
          expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
        }),
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
        grant: new KeyrackKeyGrant({
          slug: 'KEY_1',
          key: {
            secret: 'secret-1',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prod',
          org: 'ehmpathy',
          expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
        }),
      });
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'KEY_2',
          key: {
            secret: 'secret-2',
            grade: { protection: 'plaintext', duration: 'permanent' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prep',
          org: 'ehmpathy',
          expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
        }),
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
        grant: new KeyrackKeyGrant({
          slug: 'UPDATABLE_KEY',
          key: {
            secret: 'original-secret',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'all',
          org: 'ehmpathy',
          expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
        }),
      });
    });

    when('[t0] set is called with same slug', () => {
      then('new value replaces old', () => {
        store.set({
          grant: new KeyrackKeyGrant({
            slug: 'UPDATABLE_KEY',
            key: {
              secret: 'updated-secret',
              grade: { protection: 'encrypted', duration: 'transient' },
            },
            source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
            env: 'sudo',
            org: 'ehmpathy',
            expiresAt: asIsoTimeStamp(new Date(Date.now() + 120000)),
          }),
        });

        const result = store.get({ slug: 'UPDATABLE_KEY' });
        expect(result?.key.secret).toBe('updated-secret');
        expect(result?.key.grade.duration).toBe('transient');
        expect(result?.env).toBe('sudo');
      });
    });
  });

  given('[case7] multiple keys with different envs', () => {
    const store = createDaemonKeyStore();
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

    beforeEach(() => {
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'SUDO_KEY',
          key: {
            secret: 'sudo-secret',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'sudo',
          org: 'ehmpathy',
          expiresAt,
        }),
      });
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'PROD_KEY',
          key: {
            secret: 'prod-secret',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prod',
          org: 'ehmpathy',
          expiresAt,
        }),
      });
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'ALL_KEY',
          key: {
            secret: 'all-secret',
            grade: { protection: 'plaintext', duration: 'permanent' },
          },
          source: { vault: 'os.envvar', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'all',
          org: '@all',
          expiresAt,
        }),
      });
    });

    when('[t0] entries() called without filter', () => {
      then('returns all keys', () => {
        const entries = store.entries();
        expect(entries.length).toBe(3);
      });
    });

    when('[t1] entries({ env: "sudo" }) called', () => {
      then('returns only sudo keys', () => {
        const entries = store.entries({ env: 'sudo' });
        expect(entries.length).toBe(1);
        expect(entries[0]?.slug).toBe('SUDO_KEY');
        expect(entries[0]?.env).toBe('sudo');
      });
    });

    when('[t2] entries({ env: "prod" }) called', () => {
      then('returns only prod keys', () => {
        const entries = store.entries({ env: 'prod' });
        expect(entries.length).toBe(1);
        expect(entries[0]?.slug).toBe('PROD_KEY');
        expect(entries[0]?.env).toBe('prod');
      });
    });

    when('[t3] entries({ env: "all" }) called', () => {
      then('returns only all-env keys', () => {
        const entries = store.entries({ env: 'all' });
        expect(entries.length).toBe(1);
        expect(entries[0]?.slug).toBe('ALL_KEY');
        expect(entries[0]?.env).toBe('all');
      });
    });

    when('[t4] entries({ env: "nonexistent" }) called', () => {
      then('returns empty array', () => {
        const entries = store.entries({ env: 'nonexistent' });
        expect(entries.length).toBe(0);
      });
    });
  });

  given('[case8] keys with cross-org access', () => {
    const store = createDaemonKeyStore();
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

    beforeEach(() => {
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'ORG_SPECIFIC',
          key: {
            secret: 'org-secret',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'sudo',
          org: 'ehmpathy',
          expiresAt,
        }),
      });
      store.set({
        grant: new KeyrackKeyGrant({
          slug: 'CROSS_ORG',
          key: {
            secret: 'cross-org-secret',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'sudo',
          org: '@all',
          expiresAt,
        }),
      });
    });

    when('[t0] get by slug', () => {
      then('org-specific key has correct org', () => {
        const result = store.get({ slug: 'ORG_SPECIFIC' });
        expect(result?.org).toBe('ehmpathy');
      });

      then('cross-org key has @all org', () => {
        const result = store.get({ slug: 'CROSS_ORG' });
        expect(result?.org).toBe('@all');
      });
    });

    when('[t1] entries filtered by env', () => {
      then('returns both sudo keys regardless of org', () => {
        const entries = store.entries({ env: 'sudo' });
        expect(entries.length).toBe(2);
        const orgs = entries.map((e) => e.org);
        expect(orgs).toContain('ehmpathy');
        expect(orgs).toContain('@all');
      });
    });
  });
});
