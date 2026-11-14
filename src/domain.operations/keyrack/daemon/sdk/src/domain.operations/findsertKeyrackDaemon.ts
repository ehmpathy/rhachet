import { MalfunctionError } from 'helpful-errors';

import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { isDaemonReachable } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { spawnKeyrackDaemonBackground } from '@src/domain.operations/keyrack/daemon/svc';
import { withDiskMutex } from '@src/infra/lock/withRepoMutex';

import { basename, dirname, join } from 'node:path';

/**
 * .what = how long a spawned daemon may take to answer before the findsert fails
 * .why = a cold node spawn on a loaded host exceeds 5s; the poll returns the moment the
 *   daemon answers, so a wide window costs a fast host naught
 */
const REACHABLE_WAIT_MS = 20_000;

/**
 * .what = ensure keyrack daemon is alive (start if absent)
 * .why = called before unlock to ensure daemon is ready
 *
 * .note = findsert semantics: find if exists, insert if absent
 * .note = the spawn is single-flight per socket path: a caller that finds no daemon takes a
 *   disk mutex beside the socket, checks again, and spawns only if the daemon is still absent.
 *   without it, two callers that both find no daemon both spawn, and the later daemon unlinks
 *   the earlier one's live socket before it binds: a connect in that gap fails ENOENT, and
 *   the earlier daemon serves on with no socket file, its grants out of reach
 * .note = a daemon already reachable answers with no lock taken
 */
export const findsertKeyrackDaemon = async (input?: {
  socketPath?: string;
}): Promise<{ socketPath: string; spawned: boolean }> => {
  const socketPath = input?.socketPath ?? getKeyrackDaemonSocketPath();

  // check if daemon is already alive
  if (await isDaemonReachable({ socketPath })) {
    return { socketPath, spawned: false };
  }

  // spawn under the single-flight mutex; a peer that spawned first leaves a reachable daemon
  return withDiskMutex(
    {
      dir: join(dirname(socketPath), '.keyrack.daemon.spawn'),
      key: basename(socketPath),
      lease: { seconds: 60 },
      wait: { seconds: 60 },
      onWait: null,
      asTimeoutError: ({ cause }) =>
        new MalfunctionError(
          'keyrack daemon spawn waited past its bound on a peer spawn',
          {
            socketPath,
            cause,
            hint: `check the daemon: \`ls -l ${socketPath}\` for the socket, then \`rhx keyrack status\` to re-probe`,
          },
        ),
    },
    async () => {
      // a peer may have spawned it while this caller waited for the key
      if (await isDaemonReachable({ socketPath })) {
        return { socketPath, spawned: false };
      }

      // spawn daemon in background (pass socketPath for per-owner isolation)
      spawnKeyrackDaemonBackground({ socketPath });
      await waitForDaemonReachable({ socketPath });
      return { socketPath, spawned: true };
    },
  );
};

/**
 * .what = wait for a spawned daemon to answer, polled up to a bound
 * .why = the spawn returns before the daemon binds; the caller needs it reachable
 */
const waitForDaemonReachable = async (input: {
  socketPath: string;
}): Promise<void> => {
  const pollIntervalMs = 100;
  const startTime = Date.now();

  while (Date.now() - startTime < REACHABLE_WAIT_MS) {
    if (await isDaemonReachable({ socketPath: input.socketPath })) return;
    await sleep(pollIntervalMs);
  }

  // daemon did not become reachable in time
  // .why = a spawned daemon that never answers is a server-side operational failure; the
  // caller passed no input that could cause it, so no caller edit can fix it
  throw new MalfunctionError(
    `keyrack daemon did not become reachable within ${REACHABLE_WAIT_MS}ms`,
    {
      socketPath: input.socketPath,
      maxWaitMs: REACHABLE_WAIT_MS,
      pollIntervalMs,
      waitedMs: Date.now() - startTime,
      hint: `check the daemon: \`ls -l ${input.socketPath}\` for the socket, then \`rhx keyrack status\` to re-probe. if the socket is absent, run the daemon in the foreground to read its startup logs`,
    },
  );
};

/**
 * .what = sleep for a duration
 * .why = simple async delay for poll loop
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((settle) => setTimeout(settle, ms));
