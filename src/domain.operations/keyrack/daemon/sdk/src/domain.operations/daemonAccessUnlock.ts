import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { connectToKeyrackDaemon } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/sendKeyrackDaemonCommand';

/**
 * .what = send UNLOCK command to daemon to store grants with TTL
 * .why = caches credentials in daemon memory after interactive auth
 *
 * .note = owner derives socketPath if socketPath not provided
 */
export const daemonAccessUnlock = async (input: {
  keys: KeyrackKeyGrant[];
  owner?: string | null;
  socketPath?: string;
}): Promise<{ unlocked: string[] }> => {
  // derive socketPath from owner if not provided
  const socketPath =
    input.socketPath ?? getKeyrackDaemonSocketPath({ owner: input.owner });

  const socket = await connectToKeyrackDaemon({ socketPath });

  const response = await sendKeyrackDaemonCommand<{ unlocked: string[] }>({
    socket,
    command: 'UNLOCK',
    payload: { keys: input.keys },
  });

  if (!response.success) {
    throw new UnexpectedCodePathError('daemon UNLOCK command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
