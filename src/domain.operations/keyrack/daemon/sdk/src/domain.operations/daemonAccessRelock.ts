import { MalfunctionError } from 'helpful-errors';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
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
 * .note = reach NARROWS a slug purge to one reach. with none, a slug purge sweeps EVERY
 *         reach of that slug — a human who says "lock this key" means the key, not one
 *         of its reaches, and a token that survived an explicit relock would be a
 *         surprise with security weight (q1). to grant is narrow; to revoke is wide
 *
 * .note = ⚠️ the input is a UNION, not a flat bag, and that carries weight. `reach` is read
 *         only inside the slug branch of `handleRelockCommand`; the env sweep and the
 *         clear-all never consult it. as a flat optional beside `env`, a `{ env, reach }` or
 *         a bare `{ reach }` was legal TypeScript that SILENTLY dropped the filter — a
 *         failhide shape in the one operation whose job is to take credentials away. the
 *         union makes those calls unrepresentable, so the compiler forecloses them rather
 *         than a runtime check that catches them late (`rule.prefer.prevent-over-correct`)
 */
export const daemonAccessRelock = async (
  input?: {
    owner?: string | null;
    socketPath?: string;
  } & (
    | // a reach NARROWS a slug purge, so it may ride only a slug ask
    { slugs: string[]; reach?: KeyrackKeyReach; env?: undefined }
    // an env sweep and a clear-all purge whole keys; there is no reach to narrow
    | { slugs?: undefined; env?: string; reach?: undefined }
  ),
): Promise<{ relocked: string[] } | null> => {
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
    payload: { slugs: input?.slugs, env: input?.env, reach: input?.reach },
  });

  if (!response.success) {
    throw new MalfunctionError('daemon RELOCK command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
