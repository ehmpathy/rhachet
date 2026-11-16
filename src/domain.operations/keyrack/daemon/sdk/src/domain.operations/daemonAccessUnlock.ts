import { MalfunctionError } from 'helpful-errors';

import type { KeyrackDaemonUnlockRenewal } from '@src/domain.objects/keyrack/KeyrackDaemonUnlockRenewal';
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
  /**
   * .what = the keys the daemon may renew before expiry, each with its cap
   * .why = the stored `expiresAt` already folds the cap into the role creds' expiry,
   *        so the cap would be lost at unlock. a key absent here is never renewed
   * .note = required, so each unlock path decides; `[]` where none of its keys renew
   */
  renewals: KeyrackDaemonUnlockRenewal[];
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
    payload: { keys: input.keys, renewals: input.renewals },
  });

  if (!response.success) {
    throw new MalfunctionError('daemon UNLOCK command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
