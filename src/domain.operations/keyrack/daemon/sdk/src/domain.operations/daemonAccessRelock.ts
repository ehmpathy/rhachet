import { UnexpectedCodePathError } from 'helpful-errors';

import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '../infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '../infra/sendKeyrackDaemonCommand';

/**
 * .what = send RELOCK command to daemon to purge keys
 * .why = allows explicit session end or selective key revocation
 */
export const daemonAccessRelock = async (input?: {
  slugs?: string[];
  socketPath?: string;
}): Promise<{ relocked: string[] } | null> => {
  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath: input?.socketPath });
  if (!reachable) {
    return null; // daemon not found, nothing to relock
  }

  const socket = await connectToKeyrackDaemon({
    socketPath: input?.socketPath,
  });

  const response = await sendKeyrackDaemonCommand<{ relocked: string[] }>({
    socket,
    command: 'RELOCK',
    payload: { slugs: input?.slugs },
  });

  if (!response.success) {
    throw new UnexpectedCodePathError('daemon RELOCK command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
