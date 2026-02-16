import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackGrantMechanism } from '../../../../../../domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '../../../../../../domain.objects/keyrack/KeyrackHostVault';
import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';
import { connectToKeyrackDaemon } from '../infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '../infra/sendKeyrackDaemonCommand';

/**
 * .what = send UNLOCK command to daemon to store grants with TTL
 * .why = caches credentials in daemon memory after interactive auth
 */
export const daemonAccessUnlock = async (input: {
  keys: Array<{
    slug: string;
    key: KeyrackKey;
    source: {
      vault: KeyrackHostVault;
      mech: KeyrackGrantMechanism;
    };
    env: string;
    org: string;
    expiresAt: number;
  }>;
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
