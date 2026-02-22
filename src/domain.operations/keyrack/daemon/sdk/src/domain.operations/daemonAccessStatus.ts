import { UnexpectedCodePathError } from 'helpful-errors';

import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/sendKeyrackDaemonCommand';

/**
 * .what = send STATUS command to daemon to list unlocked keys
 * .why = shows what credentials are available and when they expire
 */
export const daemonAccessStatus = async (input?: {
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
  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath: input?.socketPath });
  if (!reachable) {
    return null; // daemon not found
  }

  const socket = await connectToKeyrackDaemon({
    socketPath: input?.socketPath,
  });

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
