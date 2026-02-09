import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';
import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '../infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '../infra/sendKeyrackDaemonCommand';

/**
 * .what = send GET command to daemon to retrieve keys by slug
 * .why = reads credentials from daemon memory for tool access
 */
export const daemonAccessGet = async (input: {
  slugs: string[];
  socketPath?: string;
}): Promise<{
  keys: Array<{
    slug: string;
    key: KeyrackKey;
    expiresAt: number;
  }>;
} | null> => {
  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath: input.socketPath });
  if (!reachable) {
    return null; // daemon not found, caller should fall through to other vaults
  }

  const socket = await connectToKeyrackDaemon({ socketPath: input.socketPath });

  const response = await sendKeyrackDaemonCommand<{
    keys: Array<{
      slug: string;
      key: KeyrackKey;
      expiresAt: number;
    }>;
  }>({
    socket,
    command: 'GET',
    payload: { slugs: input.slugs },
  });

  if (!response.success) {
    throw new UnexpectedCodePathError('daemon GET command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
