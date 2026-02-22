import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import type { KeyrackKey } from '@src/domain.objects/keyrack/KeyrackKey';
import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/sendKeyrackDaemonCommand';

/**
 * .what = send GET command to daemon to retrieve keys by slug
 * .why = reads credentials from daemon memory for tool access
 *
 * .note = org filter: only returns keys where key.org matches requested org OR key.org is '@all'
 * .note = env filter: only returns keys where key.env matches requested env
 */
export const daemonAccessGet = async (input: {
  slugs: string[];
  org?: string;
  env?: string;
  socketPath?: string;
}): Promise<{
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
      source: {
        vault: KeyrackHostVault;
        mech: KeyrackGrantMechanism;
      };
      env: string;
      org: string;
      expiresAt: number;
    }>;
  }>({
    socket,
    command: 'GET',
    payload: {
      slugs: input.slugs,
      org: input.org,
      env: input.env,
    },
  });

  if (!response.success) {
    throw new UnexpectedCodePathError('daemon GET command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
