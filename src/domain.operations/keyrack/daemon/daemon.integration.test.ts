import { asIsoTimeStamp } from 'iso-time';
import { given, then, useBeforeAll, when } from 'test-fns';

import { existsSync, unlinkSync } from 'node:fs';
import { KeyrackKeyGrant } from '../../../domain.objects/keyrack/KeyrackKeyGrant';
import {
  daemonAccessGet,
  daemonAccessRelock,
  daemonAccessStatus,
  daemonAccessUnlock,
  isDaemonReachable,
} from './sdk';
import { createKeyrackDaemonServer } from './svc';

describe('keyrack daemon integration', () => {
  // use a unique socket path for tests to avoid conflicts
  const testSocketPath = `/tmp/keyrack-test-${process.pid}.sock`;
  const testPidPath = testSocketPath.replace(/\.sock$/, '.pid');

  // cleanup before and after tests
  beforeAll(() => {
    if (existsSync(testSocketPath)) unlinkSync(testSocketPath);
    if (existsSync(testPidPath)) unlinkSync(testPidPath);
  });

  afterAll(() => {
    if (existsSync(testSocketPath)) unlinkSync(testSocketPath);
    if (existsSync(testPidPath)) unlinkSync(testPidPath);
  });

  given('[case1] daemon server lifecycle', () => {
    const scene = useBeforeAll(async () => {
      return createKeyrackDaemonServer({ socketPath: testSocketPath });
    });

    afterAll(() => {
      scene.server.close();
    });

    when('[t0] server is created', () => {
      then('socket file exists', () => {
        expect(existsSync(testSocketPath)).toBe(true);
      });

      then('daemon is reachable', async () => {
        const reachable = await isDaemonReachable({
          socketPath: testSocketPath,
        });
        expect(reachable).toBe(true);
      });

      then('keyStore is empty', () => {
        expect(scene.keyStore.size()).toBe(0);
      });
    });
  });

  given('[case2] daemon commands via socket', () => {
    const scene = useBeforeAll(async () => {
      return createKeyrackDaemonServer({ socketPath: testSocketPath });
    });

    afterAll(() => {
      scene.server.close();
    });

    when('[t0] UNLOCK command', () => {
      then('stores keys in daemon', async () => {
        const result = await daemonAccessUnlock({
          keys: [
            new KeyrackKeyGrant({
              slug: 'TEST_KEY_1',
              key: {
                secret: 'secret-1',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'prod',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            }),
            new KeyrackKeyGrant({
              slug: 'TEST_KEY_2',
              key: {
                secret: 'secret-2',
                grade: { protection: 'encrypted', duration: 'transient' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'sudo',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            }),
          ],
          socketPath: testSocketPath,
        });

        expect(result.unlocked.sort()).toEqual(['TEST_KEY_1', 'TEST_KEY_2']);
      });
    });

    when('[t1] GET command after unlock', () => {
      then('retrieves stored keys', async () => {
        const result = await daemonAccessGet({
          slugs: ['TEST_KEY_1', 'TEST_KEY_2'],
          socketPath: testSocketPath,
        });

        expect(result).not.toBeNull();
        expect(result!.keys.length).toBe(2);

        const key1 = result!.keys.find((k) => k.slug === 'TEST_KEY_1');
        expect(key1?.key.secret).toBe('secret-1');
      });

      then('returns empty for nonexistent keys', async () => {
        const result = await daemonAccessGet({
          slugs: ['NONEXISTENT_KEY'],
          socketPath: testSocketPath,
        });

        expect(result).not.toBeNull();
        expect(result!.keys.length).toBe(0);
      });
    });

    when('[t2] STATUS command', () => {
      then('lists unlocked keys with TTL', async () => {
        const result = await daemonAccessStatus({ socketPath: testSocketPath });

        expect(result).not.toBeNull();
        expect(result!.keys.length).toBe(2);

        const key1 = result!.keys.find((k) => k.slug === 'TEST_KEY_1');
        expect(key1).toBeDefined();
        expect(key1!.ttlLeftMs).toBeGreaterThan(0);
      });
    });

    when('[t3] RELOCK command with specific key', () => {
      then('purges only specified key', async () => {
        const result = await daemonAccessRelock({
          slugs: ['TEST_KEY_1'],
          socketPath: testSocketPath,
        });

        expect(result).not.toBeNull();
        expect(result!.relocked).toEqual(['TEST_KEY_1']);

        // verify key is gone
        const getResult = await daemonAccessGet({
          slugs: ['TEST_KEY_1'],
          socketPath: testSocketPath,
        });
        expect(getResult!.keys.length).toBe(0);

        // verify other key still present
        const getResult2 = await daemonAccessGet({
          slugs: ['TEST_KEY_2'],
          socketPath: testSocketPath,
        });
        expect(getResult2!.keys.length).toBe(1);
      });
    });

    when('[t4] RELOCK command without slugs', () => {
      then('purges all keys', async () => {
        // first add a key back
        await daemonAccessUnlock({
          keys: [
            new KeyrackKeyGrant({
              slug: 'TEST_KEY_3',
              key: {
                secret: 'secret-3',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'all',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            }),
          ],
          socketPath: testSocketPath,
        });

        // now relock all
        const result = await daemonAccessRelock({ socketPath: testSocketPath });

        expect(result).not.toBeNull();
        expect(result!.relocked.sort()).toEqual(['TEST_KEY_2', 'TEST_KEY_3']);

        // verify all keys are gone
        const status = await daemonAccessStatus({ socketPath: testSocketPath });
        expect(status!.keys.length).toBe(0);
      });
    });
  });

  given('[case3] daemon not reachable', () => {
    const unreachableSocketPath = '/tmp/keyrack-nonexistent.sock';

    when('[t0] GET is called', () => {
      then('returns null', async () => {
        const result = await daemonAccessGet({
          slugs: ['ANY_KEY'],
          socketPath: unreachableSocketPath,
        });
        expect(result).toBeNull();
      });
    });

    when('[t1] STATUS is called', () => {
      then('returns null', async () => {
        const result = await daemonAccessStatus({
          socketPath: unreachableSocketPath,
        });
        expect(result).toBeNull();
      });
    });

    when('[t2] RELOCK is called', () => {
      then('returns null', async () => {
        const result = await daemonAccessRelock({
          socketPath: unreachableSocketPath,
        });
        expect(result).toBeNull();
      });
    });
  });

  given('[case4] expired keys', () => {
    const scene = useBeforeAll(async () => {
      return createKeyrackDaemonServer({ socketPath: testSocketPath });
    });

    afterAll(() => {
      scene.server.close();
    });

    when('[t0] key with expired TTL', () => {
      then('is not returned by GET', async () => {
        // unlock with already-expired TTL
        await daemonAccessUnlock({
          keys: [
            new KeyrackKeyGrant({
              slug: 'EXPIRED_KEY',
              key: {
                secret: 'expired-secret',
                grade: { protection: 'encrypted', duration: 'transient' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'all',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() - 1000)), // already expired
            }),
          ],
          socketPath: testSocketPath,
        });

        // try to get it
        const result = await daemonAccessGet({
          slugs: ['EXPIRED_KEY'],
          socketPath: testSocketPath,
        });

        expect(result!.keys.length).toBe(0);
      });

      then('is not returned by STATUS', async () => {
        const status = await daemonAccessStatus({ socketPath: testSocketPath });
        const expiredKey = status!.keys.find((k) => k.slug === 'EXPIRED_KEY');
        expect(expiredKey).toBeUndefined();
      });
    });
  });

  given('[case5] relock with env filter', () => {
    const scene = useBeforeAll(async () => {
      return createKeyrackDaemonServer({ socketPath: testSocketPath });
    });

    afterAll(() => {
      scene.server.close();
    });

    when('[t0] keys with different envs are unlocked', () => {
      then('relock --env sudo purges only sudo keys', async () => {
        // unlock keys with different envs
        await daemonAccessUnlock({
          keys: [
            new KeyrackKeyGrant({
              slug: 'PROD_KEY',
              key: {
                secret: 'prod-secret',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'prod',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            }),
            new KeyrackKeyGrant({
              slug: 'SUDO_KEY',
              key: {
                secret: 'sudo-secret',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'sudo',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            }),
            new KeyrackKeyGrant({
              slug: 'ALL_KEY',
              key: {
                secret: 'all-secret',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'all',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            }),
          ],
          socketPath: testSocketPath,
        });

        // verify all 3 keys are present
        const statusBefore = await daemonAccessStatus({
          socketPath: testSocketPath,
        });
        expect(statusBefore!.keys.length).toBe(3);

        // relock only sudo keys
        const result = await daemonAccessRelock({
          env: 'sudo',
          socketPath: testSocketPath,
        });

        expect(result).not.toBeNull();
        expect(result!.relocked).toEqual(['SUDO_KEY']);

        // verify only prod and all keys remain
        const statusAfter = await daemonAccessStatus({
          socketPath: testSocketPath,
        });
        expect(statusAfter!.keys.length).toBe(2);
        const slugs = statusAfter!.keys.map((k) => k.slug).sort();
        expect(slugs).toEqual(['ALL_KEY', 'PROD_KEY']);
      });
    });
  });

  given('[case6] TTL extension on re-unlock', () => {
    const scene = useBeforeAll(async () => {
      return createKeyrackDaemonServer({ socketPath: testSocketPath });
    });

    afterAll(() => {
      scene.server.close();
    });

    when('[t0] key is re-unlocked with new TTL', () => {
      then('TTL is updated', async () => {
        const originalExpiresAt = asIsoTimeStamp(new Date(Date.now() + 30000)); // 30 seconds
        const newExpiresAt = asIsoTimeStamp(new Date(Date.now() + 120000)); // 2 minutes

        // initial unlock
        await daemonAccessUnlock({
          keys: [
            new KeyrackKeyGrant({
              slug: 'TTL_TEST_KEY',
              key: {
                secret: 'ttl-secret',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'all',
              org: 'testorg',
              expiresAt: originalExpiresAt,
            }),
          ],
          socketPath: testSocketPath,
        });

        // re-unlock with longer TTL
        await daemonAccessUnlock({
          keys: [
            new KeyrackKeyGrant({
              slug: 'TTL_TEST_KEY',
              key: {
                secret: 'ttl-secret',
                grade: { protection: 'encrypted', duration: 'ephemeral' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'all',
              org: 'testorg',
              expiresAt: newExpiresAt,
            }),
          ],
          socketPath: testSocketPath,
        });

        // check the TTL was extended
        const status = await daemonAccessStatus({ socketPath: testSocketPath });
        const key = status!.keys.find((k) => k.slug === 'TTL_TEST_KEY');

        expect(key).toBeDefined();
        expect(key!.expiresAt).toBe(newExpiresAt);
        expect(key!.ttlLeftMs).toBeGreaterThan(60000); // should be > 1 minute
      });
    });
  });
});
