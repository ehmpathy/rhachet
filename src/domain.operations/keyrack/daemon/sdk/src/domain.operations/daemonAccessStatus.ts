import { UnexpectedCodePathError } from 'helpful-errors';

import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/sendKeyrackDaemonCommand';

/**
 * .what = send STATUS command to daemon to list unlocked keys
 * .why = shows what credentials are available and when they expire
 *
 * .note = owner derives socketPath if socketPath not provided
 */
export const daemonAccessStatus = async (input?: {
  owner?: string | null;
  socketPath?: string;
}): Promise<{
  keys: Array<{
    slug: string;
    env: string;
    org: string;
    expiresAt: number;
    ttlLeftMs: number;
  }>;
} | null> => {
  // derive socketPath from owner if not provided
  const socketPath =
    input?.socketPath ?? getKeyrackDaemonSocketPath({ owner: input?.owner });

  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath });
  if (!reachable) {
    return null; // daemon not found
  }

  const socket = await connectToKeyrackDaemon({ socketPath });

  const response = await sendKeyrackDaemonCommand<{
    keys: Array<{
      slug: string;
      env: string;
      org: string;
      expiresAt: number;
      ttlLeftMs: number;
    }>;
  }>({
    socket,
    command: 'STATUS',
  });

  if (!response.success) {
    throw new UnexpectedCodePathError('daemon STATUS command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
