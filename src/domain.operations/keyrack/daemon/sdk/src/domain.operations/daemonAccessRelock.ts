import { UnexpectedCodePathError } from 'helpful-errors';

import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '../infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '../infra/sendKeyrackDaemonCommand';

/**
 * .what = send RELOCK command to daemon to purge keys
 * .why = allows explicit session end or selective key revocation
 *
 * .note = priority: slugs > env > all
 * .note = if slugs provided, purge only those specific keys
 * .note = if env provided (without slugs), purge only keys with that env
 * .note = if neither provided, purge all keys
 */
export const daemonAccessRelock = async (input?: {
  slugs?: string[];
  env?: string;
  socketPath?: string;
}): Promise<{ relocked: string[] } | null> => {
  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath: input?.socketPath });
  if (!reachable) {
    return null; // daemon not found — no keys to relock
  }

  const socket = await connectToKeyrackDaemon({
    socketPath: input?.socketPath,
  });

  const response = await sendKeyrackDaemonCommand<{ relocked: string[] }>({
    socket,
    command: 'RELOCK',
    payload: { slugs: input?.slugs, env: input?.env },
  });

  if (!response.success) {
    throw new UnexpectedCodePathError('daemon RELOCK command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
