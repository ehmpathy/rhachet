import { MalfunctionError } from 'helpful-errors';

import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { isDaemonReachable } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { spawnKeyrackDaemonBackground } from '@src/domain.operations/keyrack/daemon/svc';

/**
 * .what = ensure keyrack daemon is alive (start if absent)
 * .why = called before unlock to ensure daemon is ready
 *
 * .note = findsert semantics: find if exists, insert if absent
 * .note = waits for daemon to become reachable after spawn
 */
export const findsertKeyrackDaemon = async (input?: {
  socketPath?: string;
}): Promise<{ socketPath: string; spawned: boolean }> => {
  const socketPath = input?.socketPath ?? getKeyrackDaemonSocketPath();

  // check if daemon is already alive
  const alreadyReachable = await isDaemonReachable({ socketPath });
  if (alreadyReachable) {
    return { socketPath, spawned: false };
  }

  // spawn daemon in background (pass socketPath for per-owner isolation)
  spawnKeyrackDaemonBackground({ socketPath });

  // wait for daemon to become reachable (up to 5 seconds)
  const maxWaitMs = 5000;
  const pollIntervalMs = 100;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const reachable = await isDaemonReachable({ socketPath });
    if (reachable) {
      return { socketPath, spawned: true };
    }
    await sleep(pollIntervalMs);
  }

  // daemon did not become reachable in time
  // .why = a spawned daemon that never answers is a server-side operational failure; the
  // caller passed no input that could cause it, so no caller edit can fix it
  throw new MalfunctionError(
    `keyrack daemon did not become reachable within ${maxWaitMs}ms`,
    {
      socketPath,
      maxWaitMs,
      pollIntervalMs,
      waitedMs: Date.now() - startTime,
      hint: `check the daemon: \`ls -l ${socketPath}\` for the socket, then \`rhx keyrack status\` to re-probe. if the socket is absent, run the daemon in the foreground to read its startup logs`,
    },
  );
};

/**
 * .what = sleep for a duration
 * .why = simple async delay for poll loop
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
