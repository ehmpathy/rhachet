import { MalfunctionError } from 'helpful-errors';
import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/sendKeyrackDaemonCommand';

/**
 * .what = one unlocked key, as it crosses the daemon socket for STATUS
 * .why = the row is named once so a field cannot land on the response type and be
 *        forgotten on the generic — the same wire/domain seam DaemonKeyRow closes for GET
 */
export interface DaemonStatusRow {
  slug: string;
  env: string;
  org: string;

  /**
   * .what = the reach this key was cut for; absent means the reachless key
   * .note = the daemon yields one row per (slug, reach), so a slug held at three
   *         reaches renders three branches — which is exactly the rack a human wants
   *         to read when they ask "what can this repo touch?"
   */
  reach?: KeyrackKeyReach;

  /**
   * .what = when this grant dies, as an iso stamp — `null` when it never does
   * .note = 🟡 the server sends an iso stamp (`handleStatusCommand`), never a number: a
   *         `number` type would invite `expiresAt - Date.now()`, which compiles and yields
   *         `NaN` (rule.require.shapefit)
   * .note = the `| null` is NOT a copy of the GET row, which has none. a GET row exists only
   *         for a grant the daemon hands back on request; STATUS renders EVERY held key, a
   *         set that covers one stored with no expiry at all — a state `daemonKeyStore`
   *         supports on purpose ("no expiration — always valid"). two rows, two accurate
   *         declarations
   */
  expiresAt: IsoTimeStamp | null;

  /**
   * .what = milliseconds until this grant dies — `null` when it never does
   * .note = 🟡 `null`, never `Infinity`: the socket is JSON, and `JSON.stringify(Infinity)`
   *         is `null`. a client that read a bare `number` would compute
   *         `Math.round(null / 1000 / 60)` as `0`, and render a key that never expires as
   *         already dead
   */
  ttlLeftMs: number | null;

  /**
   * .what = the renew state of an sso key the daemon renews before expiry
   * .note = OPTIONAL, never nullable — absent for every key the daemon does not renew,
   *         so the json of every other key stays as it was
   * .note = `mark` names why renews stopped: `lapsed` (the sso portal session ended) or
   *         `halted` (a fault held for a full window of ticks, or a code defect at once,
   *         with its error)
   */
  renew?: {
    renewedCount: number;
    mark: { kind: 'lapsed' | 'halted'; error: string | null } | null;

    /**
     * .what = true when the grant already expires at its cap, so no renew will move it
     * .note = present only when true; an older daemon never sends it
     */
    isAtCap?: true;
  };
}

/**
 * .what = send STATUS command to daemon to list unlocked keys
 * .why = shows what credentials are available and when they expire
 *
 * .note = owner derives socketPath if socketPath not provided
 */
export const daemonAccessStatus = async (input?: {
  owner?: string | null;
  socketPath?: string;
}): Promise<{ keys: DaemonStatusRow[] } | null> => {
  // derive socketPath from owner if not provided
  const socketPath =
    input?.socketPath ?? getKeyrackDaemonSocketPath({ owner: input?.owner });

  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath });
  if (!reachable) {
    return null; // daemon not found
  }

  const socket = await connectToKeyrackDaemon({ socketPath });

  const response = await sendKeyrackDaemonCommand<{ keys: DaemonStatusRow[] }>({
    socket,
    command: 'STATUS',
  });

  if (!response.success) {
    throw new MalfunctionError('daemon STATUS command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
