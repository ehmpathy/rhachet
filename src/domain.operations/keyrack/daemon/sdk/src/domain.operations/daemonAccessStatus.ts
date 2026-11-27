import { MalfunctionError } from 'helpful-errors';
import type { IsoDuration, IsoTimeStamp } from 'iso-time';

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
export interface DaemonStatusKey {
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
   * .what = how long this grant has left — `null` when it never dies
   * .note = 🟡 `null`, never an infinite duration: the socket is JSON, which cannot carry
   *         `Infinity`. a key that never expires must never render as already dead
   * .note = OPTIONAL on the wire: a daemon from an older build sends none, so the cli
   *         derives it from `expiresAt` (`asKeyrackStatusKey`)
   */
  expiresIn?: IsoDuration | null;

  /**
   * .what = the renewal state of a key the daemon renews before expiry
   * .note = OPTIONAL, never nullable — absent for every key the daemon does not renew,
   *         so the json of every other key stays as it was
   * .note = `status`: `on` (a renewal will come), `off` (the grant already expires at its
   *         max, so none will move it), `lapsed` (the mech's upstream session ended), or
   *         `halted` (a fault held for a full window of ticks, or a code defect at once)
   * .note = `error` holds a halt's cause; `null` for every other status
   */
  renewal?: {
    status: 'on' | 'off' | 'lapsed' | 'halted';
    count: { renewed: number };
    error: string | null;
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
}): Promise<{ keys: DaemonStatusKey[] } | null> => {
  // derive socketPath from owner if not provided
  const socketPath =
    input?.socketPath ?? getKeyrackDaemonSocketPath({ owner: input?.owner });

  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath });
  if (!reachable) {
    return null; // daemon not found
  }

  const socket = await connectToKeyrackDaemon({ socketPath });

  const response = await sendKeyrackDaemonCommand<{ keys: DaemonStatusKey[] }>({
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
