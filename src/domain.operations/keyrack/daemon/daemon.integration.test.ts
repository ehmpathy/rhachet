import { asIsoTimeStamp } from 'iso-time';
import { given, then, useBeforeAll, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from 'node:fs';
import {
  daemonAccessGet,
  daemonAccessRelock,
  daemonAccessStatus,
  daemonAccessUnlock,
  isDaemonReachable,
  pruneKeyrackDaemon,
} from './sdk';
import { createKeyrackDaemonServer, spawnKeyrackDaemonBackground } from './svc';

describe('keyrack daemon integration', () => {
  // use a unique socket path for tests to avoid conflicts
  const testSocketPath = `/tmp/keyrack-test-${process.pid}.sock`;
  const testPidPath = testSocketPath.replace(/\.sock$/, '.pid');
  const testHomeHash = 'a1b2c3d4'; // test home hash for daemon identity

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
      return createKeyrackDaemonServer({
        socketPath: testSocketPath,
        homeHash: testHomeHash,
      });
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
      return createKeyrackDaemonServer({
        socketPath: testSocketPath,
        homeHash: testHomeHash,
      });
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
      return createKeyrackDaemonServer({
        socketPath: testSocketPath,
        homeHash: testHomeHash,
      });
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
      return createKeyrackDaemonServer({
        socketPath: testSocketPath,
        homeHash: testHomeHash,
      });
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
      return createKeyrackDaemonServer({
        socketPath: testSocketPath,
        homeHash: testHomeHash,
      });
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

  given('[case7] daemon auto-termination in subprocess', () => {
    // extend timeout for this test (daemon spawning + TTL expiry)
    jest.setTimeout(15000);

    // use unique socket path for this test
    const autoTermSocketPath = `/tmp/keyrack-autoterm-${process.pid}.sock`;
    const autoTermPidPath = autoTermSocketPath.replace(/\.sock$/, '.pid');

    // cleanup before and after
    beforeAll(() => {
      // ensure env is clean before test
      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      if (existsSync(autoTermSocketPath)) unlinkSync(autoTermSocketPath);
      if (existsSync(autoTermPidPath)) unlinkSync(autoTermPidPath);
    });

    afterAll(() => {
      // cleanup env var
      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      // cleanup any leftover daemon
      if (existsSync(autoTermPidPath)) {
        try {
          const pid = parseInt(readFileSync(autoTermPidPath, 'utf-8'), 10);
          process.kill(pid, 'SIGTERM');
        } catch {
          // ignore if process already gone
        }
      }
      if (existsSync(autoTermSocketPath)) unlinkSync(autoTermSocketPath);
      if (existsSync(autoTermPidPath)) unlinkSync(autoTermPidPath);
    });

    when('[t0] daemon subprocess receives keys that expire', () => {
      then('daemon terminates itself (not the test process)', async () => {
        // record test process pid to prove we survive
        const testPid = process.pid;

        // set env for short termination check interval (100ms)
        process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = '100';

        // spawn daemon as subprocess
        spawnKeyrackDaemonBackground({ socketPath: autoTermSocketPath });

        // wait for daemon to become reachable
        let reachable = false;
        for (let i = 0; i < 50 && !reachable; i++) {
          reachable = await isDaemonReachable({
            socketPath: autoTermSocketPath,
          });
          if (!reachable) await sleep(100);
        }
        expect(reachable).toBe(true);

        // verify daemon pid is different from test pid
        expect(existsSync(autoTermPidPath)).toBe(true);
        const daemonPid = parseInt(readFileSync(autoTermPidPath, 'utf-8'), 10);
        expect(daemonPid).not.toBe(testPid);

        // unlock a key with short TTL (2000ms)
        // .note = 2000ms is more robust than 500ms for CI time variance
        await daemonAccessUnlock({
          keys: [
            new KeyrackKeyGrant({
              slug: 'SHORT_LIVED_KEY',
              key: {
                secret: 'short-secret',
                grade: { protection: 'encrypted', duration: 'transient' },
              },
              source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 2000)),
            }),
          ],
          socketPath: autoTermSocketPath,
        });

        // wait for daemon to become unreachable (key expires + termination)
        // key expires at 2000ms, check runs every 100ms
        // poll with retries to handle CI time variance (60 × 100ms = 6s max)
        let stillReachable = true;
        for (let i = 0; i < 60 && stillReachable; i++) {
          await sleep(100);
          stillReachable = await isDaemonReachable({
            socketPath: autoTermSocketPath,
          });
        }
        expect(stillReachable).toBe(false);

        // verify test process is still alive (we're still running!)
        expect(process.pid).toBe(testPid);

        // verify daemon process is gone
        const daemonStillAlive = isProcessAlive(daemonPid);
        expect(daemonStillAlive).toBe(false);

        // cleanup env
        delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      });
    });
  });

  given('[case8] pruneKeyrackDaemon', () => {
    // override XDG_RUNTIME_DIR and HOME to control socket paths
    const testRuntimeDir = `/tmp/keyrack-prune-test-${process.pid}`;
    const testHomeDir = `/tmp/keyrack-prune-home-${process.pid}`;
    const originalXdgRuntimeDir = process.env['XDG_RUNTIME_DIR'];
    const originalHome = process.env['HOME'];

    beforeAll(() => {
      // create test directories
      if (!existsSync(testRuntimeDir)) mkdirSync(testRuntimeDir);
      if (!existsSync(testHomeDir)) mkdirSync(testHomeDir);
      // override env
      process.env['XDG_RUNTIME_DIR'] = testRuntimeDir;
      process.env['HOME'] = testHomeDir;
    });

    afterAll(() => {
      // restore env
      if (originalXdgRuntimeDir) {
        process.env['XDG_RUNTIME_DIR'] = originalXdgRuntimeDir;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
      if (originalHome) {
        process.env['HOME'] = originalHome;
      } else {
        delete process.env['HOME'];
      }
      // cleanup test directories
      if (existsSync(testRuntimeDir))
        rmSync(testRuntimeDir, { recursive: true, force: true });
      if (existsSync(testHomeDir))
        rmSync(testHomeDir, { recursive: true, force: true });
    });

    when('[t0] prune with no daemon active', () => {
      then('returns empty pruned array', () => {
        const result = pruneKeyrackDaemon({ owner: null });
        expect(result.pruned).toEqual([]);
      });
    });

    when('[t1] prune default owner daemon', () => {
      then('kills daemon and returns pruned entry', async () => {
        // spawn daemon without explicit socketPath (uses env-derived path)
        spawnKeyrackDaemonBackground();

        // get expected socket path via the infra helper
        const { getKeyrackDaemonSocketPath } = await import('./infra');
        const expectedSocketPath = getKeyrackDaemonSocketPath({ owner: null });
        const expectedPidPath = expectedSocketPath.replace(/\.sock$/, '.pid');

        // wait for daemon to become reachable
        let reachable = false;
        for (let i = 0; i < 50 && !reachable; i++) {
          reachable = await isDaemonReachable({
            socketPath: expectedSocketPath,
          });
          if (!reachable) await sleep(100);
        }
        expect(reachable).toBe(true);

        // get daemon pid
        const daemonPid = parseInt(readFileSync(expectedPidPath, 'utf-8'), 10);
        expect(isProcessAlive(daemonPid)).toBe(true);

        // prune via pruneKeyrackDaemon (the function under test)
        const result = pruneKeyrackDaemon({ owner: null });
        expect(result.pruned.length).toBe(1);
        expect(result.pruned[0]?.owner).toBe(null);
        expect(result.pruned[0]?.pid).toBe(daemonPid);

        // verify daemon is gone (poll with retries for CI robustness)
        let processGone = false;
        for (let i = 0; i < 20 && !processGone; i++) {
          await sleep(100);
          processGone = !isProcessAlive(daemonPid);
        }
        expect(processGone).toBe(true);
        expect(existsSync(expectedSocketPath)).toBe(false);
        expect(existsSync(expectedPidPath)).toBe(false);
      });
    });

    when('[t2] prune specific owner daemon', () => {
      then('kills only that owner daemon', async () => {
        // spawn daemon with specific owner
        const { getKeyrackDaemonSocketPath } = await import('./infra');
        const ownerSocketPath = getKeyrackDaemonSocketPath({
          owner: 'testowner',
        });
        spawnKeyrackDaemonBackground({ socketPath: ownerSocketPath });

        const ownerPidPath = ownerSocketPath.replace(/\.sock$/, '.pid');

        // wait for daemon to become reachable
        let reachable = false;
        for (let i = 0; i < 50 && !reachable; i++) {
          reachable = await isDaemonReachable({ socketPath: ownerSocketPath });
          if (!reachable) await sleep(100);
        }
        expect(reachable).toBe(true);

        // get daemon pid
        const daemonPid = parseInt(readFileSync(ownerPidPath, 'utf-8'), 10);
        expect(isProcessAlive(daemonPid)).toBe(true);

        // prune via pruneKeyrackDaemon with owner
        const result = pruneKeyrackDaemon({ owner: 'testowner' });
        expect(result.pruned.length).toBe(1);
        expect(result.pruned[0]?.owner).toBe('testowner');
        expect(result.pruned[0]?.pid).toBe(daemonPid);

        // verify daemon is gone
        await sleep(100);
        expect(isProcessAlive(daemonPid)).toBe(false);
        expect(existsSync(ownerSocketPath)).toBe(false);
        expect(existsSync(ownerPidPath)).toBe(false);
      });
    });

    when('[t3] prune @all mode with multiple daemons', () => {
      then('kills all daemons for current session', async () => {
        const { getKeyrackDaemonSocketPath } = await import('./infra');

        // spawn default daemon
        const defaultSocketPath = getKeyrackDaemonSocketPath({ owner: null });
        spawnKeyrackDaemonBackground({ socketPath: defaultSocketPath });

        // spawn owner daemon
        const ownerSocketPath = getKeyrackDaemonSocketPath({
          owner: 'ehmpath',
        });
        spawnKeyrackDaemonBackground({ socketPath: ownerSocketPath });

        // wait for both to be reachable
        for (const socketPath of [defaultSocketPath, ownerSocketPath]) {
          let reachable = false;
          for (let i = 0; i < 50 && !reachable; i++) {
            reachable = await isDaemonReachable({ socketPath });
            if (!reachable) await sleep(100);
          }
          expect(reachable).toBe(true);
        }

        // get pids
        const defaultPidPath = defaultSocketPath.replace(/\.sock$/, '.pid');
        const ownerPidPath = ownerSocketPath.replace(/\.sock$/, '.pid');
        const defaultPid = parseInt(readFileSync(defaultPidPath, 'utf-8'), 10);
        const ownerPid = parseInt(readFileSync(ownerPidPath, 'utf-8'), 10);

        // prune @all
        const result = pruneKeyrackDaemon({ owner: '@all' });
        expect(result.pruned.length).toBe(2);

        // verify both daemons are gone
        await sleep(100);
        expect(isProcessAlive(defaultPid)).toBe(false);
        expect(isProcessAlive(ownerPid)).toBe(false);
        expect(existsSync(defaultSocketPath)).toBe(false);
        expect(existsSync(ownerSocketPath)).toBe(false);
      });
    });
  });
});

/**
 * .what = sleep for a duration
 * .why = simple async delay for test time control
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * .what = check if a process is alive by pid
 * .why = verify daemon subprocess terminated
 */
const isProcessAlive = (pid: number): boolean => {
  try {
    // signal 0 doesn't kill, just checks if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
