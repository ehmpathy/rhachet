import { asIsoTimeStamp } from 'iso-time';
import { given, then, useBeforeAll, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from 'node:fs';
import { connect } from 'node:net';
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
    // extend timeout for this test (daemon spawn + TTL expiry + idle window)
    jest.setTimeout(30000);

    // use unique socket path for this test
    const autoTermSocketPath = `/tmp/keyrack-autoterm-${process.pid}.sock`;
    const autoTermPidPath = autoTermSocketPath.replace(/\.sock$/, '.pid');

    // cleanup before and after
    beforeAll(() => {
      // ensure env is clean before test
      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
      if (existsSync(autoTermSocketPath)) unlinkSync(autoTermSocketPath);
      if (existsSync(autoTermPidPath)) unlinkSync(autoTermPidPath);
    });

    afterAll(() => {
      // cleanup env var
      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
      // cleanup any leftover daemon
      if (existsSync(autoTermPidPath)) {
        try {
          const pid = parseInt(readFileSync(autoTermPidPath, 'utf-8'), 10);
          process.kill(pid, 'SIGTERM');
        } catch (error) {
          // allow expected errors: ESRCH = the daemon already self-terminated, which
          // is the very outcome this case asserts, so it is the normal path here
          // .why = EPERM means a live process this uid may not signal — a recycled
          // pid. to swallow that would leave a real daemon alive and unreported
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      }
      if (existsSync(autoTermSocketPath)) unlinkSync(autoTermSocketPath);
      if (existsSync(autoTermPidPath)) unlinkSync(autoTermPidPath);
    });

    when('[t0] daemon subprocess receives keys that expire', () => {
      then('daemon terminates itself (not the test process)', async () => {
        // record test process pid to prove we survive
        const testPid = process.pid;

        // set env for short termination check interval (100ms) + idle window (3000ms)
        // .why = the daemon now exits on "no keys AND no demand", so the idle window
        // must be short for this test to observe an exit at all
        // .note = 3000ms, not a few hundred. the window must outlast this case's own
        // SETUP, because a probe deliberately does not renew the lease (e10): the
        // daemon's clock runs from its boot, not from the last poll. so the span from
        // boot -> reachable -> daemonAccessUnlock must fit inside the window, or the
        // daemon idle-exits mid-setup and the unlock reads ECONNRESET. observed for
        // real at 500ms under a loaded host, where the poll cadence stretched past
        // the whole window and all 50 probes missed a daemon that had come and gone
        process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = '100';
        process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = '3000';

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

        // wait for daemon to become unreachable (key expires + idle window lapses)
        // key expires at 2000ms, idle window is 3000ms, check runs every 100ms
        // poll with retries to handle CI time variance (80 × 100ms = 8s max)
        // .note = this poll is ALSO the proof that demand keys on inbound bytes, not
        // on socket connects. isDaemonReachable connects and destroys without a byte
        // sent; were a bare connect counted as demand, this very loop would renew the
        // daemon's lease every 100ms and it could never die — the watch would prevent
        // the death it watches for.
        let stillReachable = true;
        for (let i = 0; i < 80 && stillReachable; i++) {
          await sleep(100);
          stillReachable = await isDaemonReachable({
            socketPath: autoTermSocketPath,
          });
        }
        expect(stillReachable).toBe(false);

        // verify test process is still alive (we survived!)
        expect(process.pid).toBe(testPid);

        // verify daemon process is gone
        // .note = poll rather than check once. the daemon unlinks its socket from an
        // 'exit' handler, which runs at the *start* of teardown — so the socket is
        // gone a beat before the process is. unreachable no longer implies dead, and
        // the two must be awaited separately.
        let daemonStillAlive = true;
        for (let i = 0; i < 30 && daemonStillAlive; i++) {
          await sleep(100);
          daemonStillAlive = isProcessAlive(daemonPid);
        }
        expect(daemonStillAlive).toBe(false);

        // verify the daemon cleaned up after itself
        // .why = self-termination exits via process.exit(0), which fires neither
        // SIGTERM nor SIGINT. without an 'exit' handler these files outlive their
        // process, so the daemon count would decay while the file count grew — and
        // `daemon prune --owner @all` would report each orphan as a phantom kill.
        expect(existsSync(autoTermSocketPath)).toBe(false);
        expect(existsSync(autoTermPidPath)).toBe(false);

        // cleanup env
        delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
        delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
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
        expect(await awaitProcessGone({ pid: daemonPid })).toBe(true);
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
        expect(await awaitProcessGone({ pid: defaultPid })).toBe(true);
        expect(await awaitProcessGone({ pid: ownerPid })).toBe(true);
        expect(existsSync(defaultSocketPath)).toBe(false);
        expect(existsSync(ownerSocketPath)).toBe(false);
      });
    });

    when('[t4] prune @all with daemons under divergent homeHash values', () => {
      then('reaps every one, not only the pruner’s own', async () => {
        // .why = [t3] spawns both daemons under ONE home, so their sockets share a
        // homeHash and differ only by owner suffix — a shape the unfixed code
        // already found. the defect fix 2 closes is the OTHER axis: a daemon whose
        // homeHash differs from the pruner's, which is what every temp-HOME caller
        // mints and what the census counted 1561 of. this case is that axis, end to
        // end through live processes rather than synthetic socket files.
        const { getKeyrackDaemonSocketPath } = await import('./infra');
        const homeOriginal = process.env['HOME']!;

        // three daemons, each born under a HOME of its own
        const spawned: { socketPath: string; pid: number }[] = [];
        for (const suffix of ['a', 'b', 'c']) {
          const homeOther = `${homeOriginal}-${suffix}`;
          if (!existsSync(homeOther)) mkdirSync(homeOther);
          process.env['HOME'] = homeOther;
          const socketPath = getKeyrackDaemonSocketPath({ owner: null });
          spawnKeyrackDaemonBackground({ socketPath });

          let reachable = false;
          for (let i = 0; i < 50 && !reachable; i++) {
            reachable = await isDaemonReachable({ socketPath });
            if (!reachable) await sleep(100);
          }
          expect(reachable).toBe(true);

          const pidPath = socketPath.replace(/\.sock$/, '.pid');
          spawned.push({
            socketPath,
            pid: parseInt(readFileSync(pidPath, 'utf-8'), 10),
          });
        }

        // the pruner runs under the ORIGINAL home, so its own homeHash matches
        // none of the three — exactly the position a human is in when the backlog
        // was minted by test runs that each set their own HOME
        process.env['HOME'] = homeOriginal;
        expect(new Set(spawned.map((one) => one.socketPath)).size).toBe(3);

        const result = pruneKeyrackDaemon({ owner: '@all' });
        expect(result.pruned.length).toBe(3);

        for (const one of spawned) {
          expect(await awaitProcessGone({ pid: one.pid })).toBe(true);
          expect(existsSync(one.socketPath)).toBe(false);
        }
      });
    });
  });

  given('[case9] repeated rounds of daemons no client ever unlocks', () => {
    // .why = this is the wish's regression clamp: run twice, the count must not
    // double. it is the only clamp on the *aggregate* — [case7] proves a single
    // daemon reaps itself, and this proves that reap holds the population flat
    // across rounds, which is what "the count plateaus and decays" reduces to at
    // a grain a test can observe.
    jest.setTimeout(60000);

    const testRuntimeDir = `/tmp/keyrack-accum-test-${process.pid}`;
    const daemonPidsSpawned: number[] = [];

    const countSockets = (): number =>
      readdirSync(testRuntimeDir).filter(
        (file) => file.startsWith('keyrack.') && file.endsWith('.sock'),
      ).length;

    beforeAll(() => {
      if (!existsSync(testRuntimeDir)) mkdirSync(testRuntimeDir);
      process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = '100';
      // .note = the window must outlast this case's own SETUP. a probe deliberately
      // does not renew the lease (e10), so each daemon's clock runs from its boot and
      // not from the last poll — spawn -> reachable -> pid read must all fit inside
      // the window, or the daemon comes and goes between two polls and is never seen
      process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = '3000';
    });

    afterAll(() => {
      // reap any daemon this case spawned that did not reap itself
      // .why = this case deliberately spawns daemons that MUST self-terminate, so
      // when the regression it clamps is present they do not — and without this
      // the test would leak exactly the daemons it exists to detect. observed for
      // real: a red run of this case left 4 keyless daemons alive on the host
      for (const pid of daemonPidsSpawned) {
        try {
          process.kill(pid, 'SIGTERM');
        } catch (error) {
          // allow expected errors: ESRCH = already gone, the outcome this case asserts
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      }

      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
      if (existsSync(testRuntimeDir))
        rmSync(testRuntimeDir, { recursive: true, force: true });
    });

    when(
      '[t0] two rounds each spawn daemons under fresh homeHash values',
      () => {
        then(
          'the socket count returns to baseline instead of doubles',
          async () => {
            // run one round: spawn 2 daemons under distinct homeHash values, as a
            // caller that mints a temp HOME does, then let the idle window lapse
            const runOneRound = async (input: {
              round: number;
            }): Promise<number> => {
              const socketPaths = [0, 1].map(
                (index) =>
                  `${testRuntimeDir}/keyrack.9999.aaaa00${input.round}${index}.sock`,
              );

              for (const socketPath of socketPaths)
                spawnKeyrackDaemonBackground({ socketPath });

              for (const socketPath of socketPaths) {
                let reachable = false;
                for (let i = 0; i < 50 && !reachable; i++) {
                  await sleep(100);
                  reachable = await isDaemonReachable({ socketPath });
                }
                expect(reachable).toBe(true);

                // record the pid so afterAll can reap a daemon that outlives its window
                const pidPath = socketPath.replace(/\.sock$/, '.pid');
                daemonPidsSpawned.push(
                  parseInt(readFileSync(pidPath, 'utf-8'), 10),
                );
              }

              // no client sends a command, so each daemon must idle out and unlink
              let socketsLeft = socketPaths.length;
              for (let i = 0; i < 120 && socketsLeft > 0; i++) {
                await sleep(100);
                socketsLeft = socketPaths.filter((path) =>
                  existsSync(path),
                ).length;
              }

              return countSockets();
            };

            // the dir starts empty, so any residue below is residue this test made
            expect(countSockets()).toBe(0);

            const countAfterRound1 = await runOneRound({ round: 1 });
            const countAfterRound2 = await runOneRound({ round: 2 });

            // the wish's clamp: a second run must not double the count
            expect(countAfterRound2).toBeLessThanOrEqual(countAfterRound1);

            // q9's stricter inner clamp: prove bounded, not merely "not worse".
            // .why = "does not double" passes even if each round leaks a steady
            // handful; only a return to baseline proves the leak is actually closed
            expect(countAfterRound1).toBe(0);
            expect(countAfterRound2).toBe(0);
          },
        );
      },
    );
  });

  given('[case10] a client that writes its request in chunks', () => {
    jest.setTimeout(30000);

    const chunkedSocketPath = `/tmp/keyrack-chunked-${process.pid}.sock`;
    const chunkedPidPath = chunkedSocketPath.replace(/\.sock$/, '.pid');

    beforeAll(() => {
      if (existsSync(chunkedSocketPath)) unlinkSync(chunkedSocketPath);
      if (existsSync(chunkedPidPath)) unlinkSync(chunkedPidPath);
    });

    afterAll(() => {
      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
      if (existsSync(chunkedPidPath)) {
        try {
          process.kill(
            parseInt(readFileSync(chunkedPidPath, 'utf-8'), 10),
            'SIGTERM',
          );
        } catch (error) {
          // allow expected errors: ESRCH = no such process (already dead)
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      }
      if (existsSync(chunkedSocketPath)) unlinkSync(chunkedSocketPath);
      if (existsSync(chunkedPidPath)) unlinkSync(chunkedPidPath);
    });

    when('[t0] the chunks span more than one termination tick', () => {
      then(
        'the daemon waits for the rest and answers, not ECONNRESET',
        async () => {
          // .why = this clamps the FINE side of the demand signal's grain (e18).
          // [case7]'s death-poll clamps the coarse side — a bare connect must not
          // count as demand. this clamps the other: a client mid-write IS demand,
          // even before its request parses. move the touch below the JSON.parse
          // and a partial write stops renewing the lease, so the daemon exits
          // under a caller that is very much alive, which sees ECONNRESET.
          // .note = the window is pinned from both sides here. it must be LONGER than
          // this case's setup — a probe does not renew the lease (e10), so the daemon's
          // clock runs from its boot and spawn -> reachable -> connect must fit inside
          // it — and SHORTER than the drip below, or the drip proves no such thing.
          // 2000ms clears a loaded-host setup; the 5000ms drip is 2.5x the window
          process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = '100';
          process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = '2000';

          spawnKeyrackDaemonBackground({ socketPath: chunkedSocketPath });

          let reachable = false;
          for (let i = 0; i < 50 && !reachable; i++) {
            await sleep(100);
            reachable = await isDaemonReachable({
              socketPath: chunkedSocketPath,
            });
          }
          expect(reachable).toBe(true);

          // drip a STATUS request one byte at a time over ~5000ms — well past
          // the 2000ms idle window, and across ~50 termination ticks
          const request = JSON.stringify({ command: 'STATUS', payload: {} });
          const response = await new Promise<string>((emit, reject) => {
            const socket = connect(chunkedSocketPath);
            let received = '';
            socket.on('data', (chunk) => {
              received += chunk.toString();
            });
            socket.on('end', () => emit(received));
            socket.on('error', reject);
            socket.on('connect', async () => {
              for (const char of request.slice(0, -1)) {
                socket.write(char);
                await sleep(5000 / request.length);
              }
              // the final byte completes the json and draws the response
              socket.write(request.slice(-1));
            });
          });

          // a response at all is the assertion: the daemon stayed up for a caller
          // whose bytes arrived slower than its whole idle window
          expect(JSON.parse(response).success).toBe(true);

          delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
          delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
        },
      );
    });
  });

  given('[case11] two daemons that raced onto one socket path', () => {
    jest.setTimeout(40000);

    const racedSocketPath = `/tmp/keyrack-raced-${process.pid}.sock`;
    const racedPidPath = racedSocketPath.replace(/\.sock$/, '.pid');
    const pidsSpawned: number[] = [];

    beforeAll(() => {
      if (existsSync(racedSocketPath)) unlinkSync(racedSocketPath);
      if (existsSync(racedPidPath)) unlinkSync(racedPidPath);
    });

    afterAll(() => {
      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
      // .why = this case deliberately spawns two daemons; a test that provokes a
      // leak must reap what it provokes, or it is itself the leak it studies
      for (const pid of pidsSpawned) {
        try {
          process.kill(pid, 'SIGTERM');
        } catch (error) {
          // allow expected errors: ESRCH = no such process (already dead)
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      }
      if (existsSync(racedSocketPath)) unlinkSync(racedSocketPath);
      if (existsSync(racedPidPath)) unlinkSync(racedPidPath);
    });

    when('[t0] the earlier one idle-exits while the later serves', () => {
      then('it leaves the successor files intact', async () => {
        // .why = findsertKeyrackDaemon is a check-then-spawn, so two concurrent
        // unlocks can both spawn onto one path. that race pre-dates this branch,
        // and it does NOT collide: createKeyrackDaemonServer unlinks any stale
        // socket before it binds, so the later daemon silently takes the path over
        // and the earlier one lives on with a socket file it no longer owns.
        //
        // this branch is what makes that earlier daemon finally exit — and an exit
        // handler that unlinked by path alone would then delete the *live*
        // successor's socket and pid. the successor would keep its listener and
        // serve on with no file on disk: unreachable to every new client and
        // invisible to `daemon prune` for its whole life. a strictly worse leak
        // than the one this branch set out to fix, introduced by the fix itself.
        // hence the ownership check — and hence this clamp on it.
        // the window must outlast the handover below, so the earlier daemon is
        // still alive when the later one takes its path — that overlap IS the case
        process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = '100';
        process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = '4000';

        // the earlier daemon takes the path
        spawnKeyrackDaemonBackground({ socketPath: racedSocketPath });
        let reachable = false;
        for (let i = 0; i < 50 && !reachable; i++) {
          await sleep(100);
          reachable = await isDaemonReachable({ socketPath: racedSocketPath });
        }
        expect(reachable).toBe(true);
        const pidEarlier = parseInt(
          readFileSync(racedPidPath, 'utf-8').trim(),
          10,
        );
        pidsSpawned.push(pidEarlier);

        // the later daemon takes the same path over, exactly as the race would
        spawnKeyrackDaemonBackground({ socketPath: racedSocketPath });
        let pidLater = pidEarlier;
        for (let i = 0; i < 50 && pidLater === pidEarlier; i++) {
          await sleep(100);
          pidLater = parseInt(readFileSync(racedPidPath, 'utf-8').trim(), 10);
        }
        expect(pidLater).not.toEqual(pidEarlier);
        pidsSpawned.push(pidLater);

        // keep the successor in demand past the point where the earlier one exits
        // .note = a STATUS command, not isDaemonReachable. a bare connect is
        // deliberately NOT demand (e10), so a reachability poll would renew no
        // lease and both daemons would idle out together — the overlap this case
        // needs would never exist
        for (let i = 0; i < 20; i++) {
          await sleep(300);
          await daemonAccessStatus({ socketPath: racedSocketPath });
        }

        // the earlier daemon is gone, and it took no file with it
        expect(isProcessAlive(pidEarlier)).toBe(false);
        expect(isProcessAlive(pidLater)).toBe(true);
        expect(existsSync(racedSocketPath)).toBe(true);
        expect(existsSync(racedPidPath)).toBe(true);
        expect(readFileSync(racedPidPath, 'utf-8').trim()).toEqual(
          String(pidLater),
        );

        delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
        delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
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
 * .what = wait until a process is gone, up to a bounded number of polls
 * .why = a SIGTERM is a request, not an instant. the daemon's shutdown closes its
 *        server, reads its pid file to confirm ownership, unlinks both files, and
 *        only then exits — so "prune returned" and "the process is gone" are two
 *        events, not one. a single check after a fixed sleep asserts a race and
 *        fails on whichever machine is slowest that day
 *
 * .note = returns the verdict rather than assert, so each caller keeps its own
 *         expect() and its own failure message
 */
const awaitProcessGone = async (input: { pid: number }): Promise<boolean> => {
  for (let i = 0; i < 30; i++) {
    if (!isProcessAlive(input.pid)) return true;
    await sleep(100);
  }
  return !isProcessAlive(input.pid);
};

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
