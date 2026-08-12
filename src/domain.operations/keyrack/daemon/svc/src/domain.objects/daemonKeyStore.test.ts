import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

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

  // .note = a plaintext-exid juggle on os.secure + PERMANENT_VIA_REPLICA: one key name,
  //         N copies, one per claude account. the exid is opaque here — the store only
  //         ever files a value under it and looks it back up
  given('[case9] one slug held at two reaches, plus reachless', () => {
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));
    const reachBeav: KeyrackKeyReach = { exid: 'beav@ehmpathy.com' };
    const reachVlad: KeyrackKeyReach = { exid: 'vlad@ehmpathy.com' };

    const genGrant = (grant: {
      secret: string;
      reach?: KeyrackKeyReach;
    }): KeyrackKeyGrant =>
      new KeyrackKeyGrant({
        slug: 'ahbode.prep.ANTHROPIC_API_KEY',
        key: {
          secret: grant.secret,
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
        env: 'prep',
        org: 'ahbode',
        reach: grant.reach,
        expiresAt,
      });

    const genStoreWithAllThree = () => {
      const store = createDaemonKeyStore();
      // .note = reachless set LAST, to prove order does not decide who survives (e8)
      store.set({
        grant: genGrant({ secret: 'at-beav', reach: reachBeav }),
      });
      store.set({
        grant: genGrant({ secret: 'at-vlad', reach: reachVlad }),
      });
      store.set({ grant: genGrant({ secret: 'reachless' }) });
      return store;
    };

    when('[t0] all three are held', () => {
      then('e8/e9: each reads back its own secret, none evicts another', () => {
        const store = genStoreWithAllThree();
        expect(store.size()).toBe(3);
        expect(
          store.get({ slug: 'ahbode.prep.ANTHROPIC_API_KEY' })?.key.secret,
        ).toBe('reachless');
        expect(
          store.get({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: reachBeav,
          })?.key.secret,
        ).toBe('at-beav');
        expect(
          store.get({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: reachVlad,
          })?.key.secret,
        ).toBe('at-vlad');
      });

      then('e6: a reach no key was cut for reads back null', () => {
        const store = genStoreWithAllThree();
        expect(
          store.get({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: { exid: 'someone-else@ehmpathy.com' },
          }),
        ).toBeNull();
      });
    });

    when('[t1] the same reach is re-unlocked', () => {
      then('e10: it overwrites only that one; the others are untouched', () => {
        const store = genStoreWithAllThree();
        store.set({
          grant: genGrant({ secret: 'at-beav-v2', reach: reachBeav }),
        });
        expect(store.size()).toBe(3);
        expect(
          store.get({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: reachBeav,
          })?.key.secret,
        ).toBe('at-beav-v2');
        expect(
          store.get({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: reachVlad,
          })?.key.secret,
        ).toBe('at-vlad');
        expect(
          store.get({ slug: 'ahbode.prep.ANTHROPIC_API_KEY' })?.key.secret,
        ).toBe('reachless');
      });
    });

    when('[t2] del names one reach', () => {
      then('e11: only that one is purged', () => {
        const store = genStoreWithAllThree();
        expect(
          store.del({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: reachBeav,
          }),
        ).toBe(true);
        expect(store.size()).toBe(2);
        expect(
          store.get({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: reachBeav,
          }),
        ).toBeNull();
        expect(
          store.get({
            slug: 'ahbode.prep.ANTHROPIC_API_KEY',
            reach: reachVlad,
          })?.key.secret,
        ).toBe('at-vlad');
      });
    });

    when('[t3] del names the slug alone', () => {
      then('e12: every reach of that slug is swept', () => {
        const store = genStoreWithAllThree();
        expect(store.del({ slug: 'ahbode.prep.ANTHROPIC_API_KEY' })).toBe(true);
        expect(store.size()).toBe(0);
      });

      then('e12: a peer slug is left alone', () => {
        const store = genStoreWithAllThree();
        store.set({
          grant: new KeyrackKeyGrant({
            slug: 'ahbode.prep.OTHER_TOKEN',
            key: {
              secret: 'other',
              grade: { protection: 'encrypted', duration: 'ephemeral' },
            },
            source: { vault: 'os.secure', mech: 'EPHEMERAL_VIA_GITHUB_APP' },
            env: 'prep',
            org: 'ahbode',
            reach: reachBeav,
            expiresAt,
          }),
        });
        store.del({ slug: 'ahbode.prep.ANTHROPIC_API_KEY' });
        expect(store.size()).toBe(1);
        expect(
          store.get({ slug: 'ahbode.prep.OTHER_TOKEN', reach: reachBeav })?.key
            .secret,
        ).toBe('other');
      });
    });
  });

  given(
    '[case10] an env=all key held at a reach, asked for by a scoped env',
    () => {
      const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));
      const reachBeav: KeyrackKeyReach = { exid: 'beav@ehmpathy.com' };

      const genStore = () => {
        const store = createDaemonKeyStore();
        // the REACHLESS env=all key — what a reach-ask must never be handed
        store.set({
          grant: new KeyrackKeyGrant({
            slug: 'ahbode.all.ANTHROPIC_API_KEY',
            key: {
              secret: 'reachless-all',
              grade: { protection: 'encrypted', duration: 'ephemeral' },
            },
            source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
            env: 'all',
            org: 'ahbode',
            expiresAt,
          }),
        });
        return store;
      };

      when('[t0] a reach-ask falls through the env=all fallback', () => {
        then(
          'e18-reborn: it does NOT hand back the reachless env=all credential',
          () => {
            const store = genStore();
            expect(
              store.get({
                slug: 'ahbode.prep.ANTHROPIC_API_KEY',
                reach: reachBeav,
              }),
            ).toBeNull();
          },
        );

        then('e1: a reachless ask still gets the env=all fallback', () => {
          const store = genStore();
          expect(
            store.get({ slug: 'ahbode.prep.ANTHROPIC_API_KEY' })?.key.secret,
          ).toBe('reachless-all');
        });
      });

      when('[t1] the env=all key is held AT that reach', () => {
        then('the fallback carries the reach across and finds it', () => {
          const store = genStore();
          store.set({
            grant: new KeyrackKeyGrant({
              slug: 'ahbode.all.ANTHROPIC_API_KEY',
              key: {
                secret: 'all-at-beav',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'all',
              org: 'ahbode',
              reach: reachBeav,
              expiresAt,
            }),
          });
          expect(
            store.get({
              slug: 'ahbode.prep.ANTHROPIC_API_KEY',
              reach: reachBeav,
            })?.key.secret,
          ).toBe('all-at-beav');
        });
      });
    },
  );
});
