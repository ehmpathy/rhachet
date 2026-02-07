import { getKeyrackDaemonSocketPath } from '../../../infra/getKeyrackDaemonSocketPath';
import { spawnKeyrackDaemonBackground } from '../../../svc';
import { isDaemonReachable } from '../infra/connectToKeyrackDaemon';

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

  // spawn daemon in background
  spawnKeyrackDaemonBackground();

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
  throw new Error(
    `keyrack daemon did not become reachable within ${maxWaitMs}ms`,
  );
};

/**
 * .what = sleep for a duration
 * .why = simple async delay for poll loop
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
