import { UnexpectedCodePathError } from 'helpful-errors';

import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/sendKeyrackDaemonCommand';

/**
 * .what = send RELOCK command to daemon to purge keys
 * .why = allows explicit session end or selective key revocation
 *
 * .note = priority: slugs > env > all
 * .note = if slugs provided, purge only those specific keys
 * .note = if env provided (without slugs), purge only keys with that env
 * .note = if neither provided, purge all keys
 * .note = owner derives socketPath if socketPath not provided
 */
export const daemonAccessRelock = async (input?: {
  slugs?: string[];
  env?: string;
  owner?: string | null;
  socketPath?: string;
}): Promise<{ relocked: string[] } | null> => {
  // derive socketPath from owner if not provided
  const socketPath =
    input?.socketPath ?? getKeyrackDaemonSocketPath({ owner: input?.owner });

  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath });
  if (!reachable) {
    return null; // daemon not found — no keys to relock
  }

  const socket = await connectToKeyrackDaemon({ socketPath });

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
