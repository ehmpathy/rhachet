import { given, then, useBeforeAll, when } from 'test-fns';

import { isDaemonReachable } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { findsertKeyrackDaemon } from './findsertKeyrackDaemon';

/**
 * .what = stop the daemon a case spawned, and remove its files
 * .why = a detached daemon outlives the test; the pid file names the one to stop
 */
const killDaemonAt = (input: { socketPath: string }): void => {
  const pidPath = input.socketPath.replace(/\.sock$/, '.pid');
  if (existsSync(pidPath)) {
    const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      // allow expected errors: ESRCH = no such process (already dead)
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  }
  if (existsSync(input.socketPath)) unlinkSync(input.socketPath);
  if (existsSync(pidPath)) unlinkSync(pidPath);
};

describe('findsertKeyrackDaemon', () => {
  given('[case1] no daemon at a socket path, and four callers at once', () => {
    // .note = a short /tmp path: a unix socket path is capped near 104 chars
    const socketPath = `/tmp/keyrack-findsert-race-${process.pid}.sock`;
    beforeAll(() => killDaemonAt({ socketPath }));
    afterAll(() => killDaemonAt({ socketPath }));

    when('[t0] all four findsert the daemon in one tick', () => {
      // .note = the results sit under a key, since useBeforeAll hands back an object proxy
      const burst = useBeforeAll(async () => ({
        results: await Promise.all(
          [1, 2, 3, 4].map(() => findsertKeyrackDaemon({ socketPath })),
        ),
      }));

      then('exactly one of them spawned a daemon', () => {
        const spawnedCount = burst.results.filter(
          (result) => result.spawned,
        ).length;
        expect(spawnedCount).toEqual(1);
      });

      then('every caller got the socket path it asked for', () => {
        for (const result of burst.results)
          expect(result.socketPath).toEqual(socketPath);
      });

      then('the one daemon answers at that path', async () => {
        expect(await isDaemonReachable({ socketPath })).toEqual(true);
      });
    });

    when('[t1] a fifth caller arrives once the daemon answers', () => {
      then('it spawns none', async () => {
        const result = await findsertKeyrackDaemon({ socketPath });
        expect(result.spawned).toEqual(false);
      });
    });
  });
});
