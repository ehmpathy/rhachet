import { getAllKeyrackDaemonSocketPaths } from '@src/domain.operations/keyrack/daemon/infra';

import { killKeyrackDaemon } from './killKeyrackDaemon';

/**
 * .what = prune keyrack daemon(s) by owner
 * .why = restart daemon with current bytecode after code changes
 *
 * .note = @all kills all daemons for current session
 * .note = specific owner kills only that owner's daemon
 * .note = null owner kills the default daemon
 */
export const pruneKeyrackDaemon = (input: {
  owner: string | null;
}): { pruned: Array<{ owner: string | null; pid: number }> } => {
  // handle @all: prune all daemons for current session
  if (input.owner === '@all') {
    const allSockets = getAllKeyrackDaemonSocketPaths();
    const pruned: Array<{ owner: string | null; pid: number }> = [];

    for (const { socketPath, owner } of allSockets) {
      const result = killKeyrackDaemon({ socketPath, owner });
      if (result.killed && result.pid !== null) {
        pruned.push({ owner, pid: result.pid });
      }
    }

    return { pruned };
  }

  // handle specific owner (or default)
  const result = killKeyrackDaemon({ owner: input.owner });

  if (result.killed && result.pid !== null) {
    return { pruned: [{ owner: input.owner, pid: result.pid }] };
  }

  return { pruned: [] };
};
