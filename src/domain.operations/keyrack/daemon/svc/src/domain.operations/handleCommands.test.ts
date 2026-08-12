import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessStatus';
import { createDaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';

import { handleGetCommand } from './handleGetCommand';
import { handleRelockCommand } from './handleRelockCommand';
import { handleStatusCommand } from './handleStatusCommand';
import { handleUnlockCommand } from './handleUnlockCommand';

describe('handleUnlockCommand', () => {
  given('[case1] keys to unlock', () => {
    const keyStore = createDaemonKeyStore();
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

    when('[t0] unlock command is handled', () => {
      then('keys are stored in keyStore', () => {
        const result = handleUnlockCommand(
          {
            keys: [
              new KeyrackKeyGrant({
                slug: 'AWS_SSO_PREP',
                key: {
                  secret: 'secret-1',
                  grade: { protection: 'encrypted', duration: 'ephemeral' },
                },
                source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
                env: 'prep',
                org: 'ehmpathy',
                expiresAt,
              }),
              new KeyrackKeyGrant({
                slug: 'XAI_API_KEY',
                key: {
                  secret: 'secret-2',
                  grade: { protection: 'encrypted', duration: 'permanent' },
                },
                source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
                env: 'all',
                org: 'ehmpathy',
                expiresAt,
              }),
            ],
          },
          { keyStore },
        );

        expect(result.unlocked).toEqual(['AWS_SSO_PREP', 'XAI_API_KEY']);
        expect(keyStore.get({ slug: 'AWS_SSO_PREP' })?.key.secret).toBe(
          'secret-1',
        );
        expect(keyStore.get({ slug: 'XAI_API_KEY' })?.key.secret).toBe(
          'secret-2',
        );
      });

      then('env and org are stored with keys', () => {
        handleUnlockCommand(
          {
            keys: [
              new KeyrackKeyGrant({
                slug: 'SUDO_KEY',
                key: {
                  secret: 'sudo-secret',
                  grade: { protection: 'encrypted', duration: 'ephemeral' },
                },
                source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
                env: 'sudo',
                org: '@all',
                expiresAt,
              }),
            ],
          },
          { keyStore },
        );

        const key = keyStore.get({ slug: 'SUDO_KEY' });
        expect(key?.env).toBe('sudo');
        expect(key?.org).toBe('@all');
      });
    });
  });
});

describe('handleGetCommand', () => {
  given('[case1] keys in store', () => {
    const keyStore = createDaemonKeyStore();
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

    beforeEach(() => {
      keyStore.set({
        grant: new KeyrackKeyGrant({
          slug: 'KEY_A',
          key: {
            secret: 'secret-a',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prod',
          org: 'ehmpathy',
          expiresAt,
        }),
      });
      keyStore.set({
        grant: new KeyrackKeyGrant({
          slug: 'KEY_B',
          key: {
            secret: 'secret-b',
            grade: { protection: 'plaintext', duration: 'permanent' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'sudo',
          org: '@all',
          expiresAt,
        }),
      });
    });

    when('[t0] get command requests some keys', () => {
      then('returns the requested keys that exist', () => {
        const result = handleGetCommand(
          { slugs: ['KEY_A', 'KEY_C'] },
          { keyStore },
        );

        expect(result.keys.length).toBe(1);
        expect(result.keys[0]?.slug).toBe('KEY_A');
        expect(result.keys[0]?.key.secret).toBe('secret-a');
      });

      then('returns env and org with keys', () => {
        const result = handleGetCommand(
          { slugs: ['KEY_A', 'KEY_B'] },
          { keyStore },
        );

        const keyA = result.keys.find((k) => k.slug === 'KEY_A');
        const keyB = result.keys.find((k) => k.slug === 'KEY_B');

        expect(keyA?.env).toBe('prod');
        expect(keyA?.org).toBe('ehmpathy');
        expect(keyB?.env).toBe('sudo');
        expect(keyB?.org).toBe('@all');
      });
    });

    when('[t1] get command requests all keys', () => {
      then('returns all keys', () => {
        const result = handleGetCommand(
          { slugs: ['KEY_A', 'KEY_B'] },
          { keyStore },
        );

        expect(result.keys.length).toBe(2);
      });
    });
  });
});

describe('handleStatusCommand', () => {
  const homeHash = 'a1b2c3d4'; // test home hash

  given('[case1] keys in store with valid TTL', () => {
    const keyStore = createDaemonKeyStore();
    const now = Date.now();
    const expiresAt1 = asIsoTimeStamp(new Date(now + 60000)); // 1 min
    const expiresAt2 = asIsoTimeStamp(new Date(now + 120000)); // 2 min

    beforeEach(() => {
      keyStore.set({
        grant: new KeyrackKeyGrant({
          slug: 'KEY_1',
          key: {
            secret: 'secret-1',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prod',
          org: 'ehmpathy',
          expiresAt: expiresAt1,
        }),
      });
      keyStore.set({
        grant: new KeyrackKeyGrant({
          slug: 'KEY_2',
          key: {
            secret: 'secret-2',
            grade: { protection: 'encrypted', duration: 'transient' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'sudo',
          org: '@all',
          expiresAt: expiresAt2,
        }),
      });
    });

    when('[t0] status command is handled', () => {
      then('returns keys with TTL left', () => {
        const result = handleStatusCommand({}, { keyStore, homeHash });

        expect(result.keys.length).toBe(2);

        const key1 = result.keys.find((k) => k.slug === 'KEY_1');
        const key2 = result.keys.find((k) => k.slug === 'KEY_2');

        expect(key1?.expiresAt).toBe(expiresAt1);
        expect(key2?.expiresAt).toBe(expiresAt2);

        // ttlLeftMs should be approximately correct (allow 100ms margin)
        expect(key1?.ttlLeftMs).toBeGreaterThan(59000);
        expect(key1?.ttlLeftMs).toBeLessThanOrEqual(60000);
      });

      then('returns env and org with keys', () => {
        const result = handleStatusCommand({}, { keyStore, homeHash });

        const key1 = result.keys.find((k) => k.slug === 'KEY_1');
        const key2 = result.keys.find((k) => k.slug === 'KEY_2');

        expect(key1?.env).toBe('prod');
        expect(key1?.org).toBe('ehmpathy');
        expect(key2?.env).toBe('sudo');
        expect(key2?.org).toBe('@all');
      });
    });
  });

  given('[case2] empty store', () => {
    const keyStore = createDaemonKeyStore();

    when('[t0] status command is handled', () => {
      then('returns empty keys array', () => {
        const result = handleStatusCommand({}, { keyStore, homeHash });
        expect(result.keys).toEqual([]);
      });
    });
  });

  /**
   * .what = the wire seam — the server's row must satisfy the client's declared row
   * .why = ⚠️ the daemon protocol is declared TWICE, in two files the compiler does not
   *        link: the svc handler states what it sends, and `DaemonStatusRow` states what
   *        the sdk claims to receive. a divergence between them fails NO build and NO test
   *
   * .note = this seam has now drifted twice, in the same family, and each drift was found
   *         by a human read rather than by a check:
   *         - 2026-08-04 · `DaemonKeyRow.expiresAt` declared `number`, server sent a stamp
   *         - 2026-08-06 · `DaemonStatusRow.expiresAt` declared `number`, the SAME defect,
   *           in the sibling row, unrepaired by the first fix
   *         a fix that must be applied by hand at each twin is a fix that will be missed.
   *         this clamp is the generalization the first repair lacked
   * .note = it bites at COMPILE time, which is the only grain that can see it. an assignment
   *         is the whole assertion; the runtime `expect` below exists so the case is not a
   *         silently empty test body (rule.forbid.failhide)
   */
  given('[case3] the status row as the sdk declares it', () => {
    const keyStore = createDaemonKeyStore();

    when('[t0] a key is held with NO expiry', () => {
      beforeEach(() => {
        keyStore.set({
          grant: new KeyrackKeyGrant({
            slug: 'KEY_FOREVER',
            key: {
              secret: 'secret-forever',
              grade: { protection: 'encrypted', duration: 'permanent' },
            },
            source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
            env: 'prod',
            org: 'ehmpathy',
          }),
        });
      });

      // ⚠️ THE clamp, and it is the ASSIGNMENT rather than the expect. under
      //    `expiresAt: number` this line does not compile, because the server sends a stamp
      then('the server rows are assignable to DaemonStatusRow', () => {
        const rows: DaemonStatusRow[] = handleStatusCommand(
          {},
          { keyStore, homeHash },
        ).keys;

        expect(rows).toHaveLength(1);
      });

      // .why null rather than Infinity = the socket is JSON, and `JSON.stringify(Infinity)`
      //      is `"null"`. so a server that sent `Infinity` was ALREADY sending null, while
      //      both sides declared `number` — and `Math.round(null / 1000 / 60)` is `0`, which
      //      rendered a key that never expires as `expires in: 0m`
      then('a key with no expiry reports null, never Infinity', () => {
        const row = handleStatusCommand({}, { keyStore, homeHash }).keys[0]!;

        expect(row.expiresAt).toEqual(null);
        expect(row.ttlLeftMs).toEqual(null);
        expect(row.ttlLeftMs).not.toEqual(Infinity);
      });

      // .note = the proof that the JSON claim above is a fact rather than a reasoned guess.
      //         a round-trip through the exact codec the socket uses
      //         (`handleKeyrackDaemonConnection` writes `JSON.stringify`,
      //         `sendKeyrackDaemonCommand` reads `JSON.parse`)
      then('the row survives the socket codec unchanged', () => {
        const row = handleStatusCommand({}, { keyStore, homeHash }).keys[0]!;
        const overWire = JSON.parse(JSON.stringify(row)) as DaemonStatusRow;

        expect(overWire.ttlLeftMs).toEqual(row.ttlLeftMs);
        expect(overWire.expiresAt).toEqual(row.expiresAt);
      });
    });
  });
});

describe('handleRelockCommand', () => {
  given('[case1] keys in store', () => {
    const keyStore = createDaemonKeyStore();
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

    beforeEach(() => {
      keyStore.set({
        grant: new KeyrackKeyGrant({
          slug: 'KEY_A',
          key: {
            secret: 'secret-a',
            grade: { protection: 'encrypted', duration: 'ephemeral' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prod',
          org: 'ehmpathy',
          expiresAt,
        }),
      });
      keyStore.set({
        grant: new KeyrackKeyGrant({
          slug: 'KEY_B',
          key: {
            secret: 'secret-b',
            grade: { protection: 'encrypted', duration: 'transient' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'prod',
          org: 'ehmpathy',
          expiresAt,
        }),
      });
    });

    when('[t0] relock command with specific slugs', () => {
      then('deletes only specified keys', () => {
        const result = handleRelockCommand({ slugs: ['KEY_A'] }, { keyStore });

        expect(result.relocked).toEqual(['KEY_A']);
        expect(keyStore.get({ slug: 'KEY_A' })).toBeNull();
        expect(keyStore.get({ slug: 'KEY_B' })).not.toBeNull();
      });
    });

    when('[t1] relock command without slugs', () => {
      then('clears all keys', () => {
        const result = handleRelockCommand({}, { keyStore });

        expect(result.relocked.sort()).toEqual(['KEY_A', 'KEY_B']);
        expect(keyStore.size()).toBe(0);
      });
    });

    when('[t2] relock command with empty slugs array', () => {
      then('clears all keys', () => {
        const result = handleRelockCommand({ slugs: [] }, { keyStore });

        expect(result.relocked.sort()).toEqual(['KEY_A', 'KEY_B']);
        expect(keyStore.size()).toBe(0);
      });
    });
  });

  given('[case2] keys with different envs', () => {
    const keyStore = createDaemonKeyStore();
    const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

    beforeEach(() => {
      keyStore.set({
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
      keyStore.set({
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
      keyStore.set({
        grant: new KeyrackKeyGrant({
          slug: 'ALL_KEY',
          key: {
            secret: 'all-secret',
            grade: { protection: 'plaintext', duration: 'permanent' },
          },
          source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
          env: 'all',
          org: 'ehmpathy',
          expiresAt,
        }),
      });
    });

    when('[t0] relock command with env filter', () => {
      then('deletes only keys with matched env', () => {
        const result = handleRelockCommand({ env: 'sudo' }, { keyStore });

        expect(result.relocked).toEqual(['SUDO_KEY']);
        expect(keyStore.get({ slug: 'SUDO_KEY' })).toBeNull();
        expect(keyStore.get({ slug: 'PROD_KEY' })).not.toBeNull();
        expect(keyStore.get({ slug: 'ALL_KEY' })).not.toBeNull();
        expect(keyStore.size()).toBe(2);
      });
    });

    when('[t1] relock command with env filter and no matched keys', () => {
      then('returns empty relocked array', () => {
        const result = handleRelockCommand({ env: 'prep' }, { keyStore });

        expect(result.relocked).toEqual([]);
        expect(keyStore.size()).toBe(3);
      });
    });

    when('[t2] relock command with slugs takes priority over env', () => {
      then('deletes only specified slugs', () => {
        // slugs should take priority over env filter
        const result = handleRelockCommand(
          { slugs: ['PROD_KEY'], env: 'sudo' },
          { keyStore },
        );

        expect(result.relocked).toEqual(['PROD_KEY']);
        expect(keyStore.get({ slug: 'SUDO_KEY' })).not.toBeNull();
        expect(keyStore.get({ slug: 'PROD_KEY' })).toBeNull();
        expect(keyStore.get({ slug: 'ALL_KEY' })).not.toBeNull();
      });
    });
  });
});
