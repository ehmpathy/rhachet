import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackKeyGrant } from '../../../../../../domain.objects/keyrack/KeyrackKeyGrant';
import { connectToKeyrackDaemon } from '../infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '../infra/sendKeyrackDaemonCommand';

/**
 * .what = send UNLOCK command to daemon to store grants with TTL
 * .why = caches credentials in daemon memory after interactive auth
 */
export const daemonAccessUnlock = async (input: {
  keys: KeyrackKeyGrant[];
  socketPath?: string;
}): Promise<{ unlocked: string[] }> => {
  const socket = await connectToKeyrackDaemon({ socketPath: input.socketPath });

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
