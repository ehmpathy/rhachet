import { MalfunctionError } from 'helpful-errors';
import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import type { KeyrackKey } from '@src/domain.objects/keyrack/KeyrackKey';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from '@src/domain.operations/keyrack/daemon/sdk/src/infra/connectToKeyrackDaemon';
import { sendKeyrackDaemonCommand } from '@src/domain.operations/keyrack/daemon/sdk/src/infra/sendKeyrackDaemonCommand';

/**
 * .what = one granted key, as it crosses the daemon socket
 * .why = the WIRE shape is not the domain shape, and the compiler does not link the two. with
 *        the row named once, a field added here cannot land on the response type and be
 *        forgotten on the request type — a mismatch the build would not have caught
 */
export interface DaemonKeyRow {
  slug: string;
  key: KeyrackKey;
  source: {
    vault: KeyrackHostVault;
    mech: KeyrackGrantMechanism;
  };
  env: string;
  org: string;

  /**
   * .what = the reach this key was cut for; absent means the reachless key
   * .note = absent, never null — a null would move every extant json payload (e16)
   */
  reach?: KeyrackKeyReach;

  /**
   * .what = when this grant dies, as an iso stamp
   * .note = ⚠️ declared `number` until 2026-08-04, and that declaration was simply wrong.
   *         `daemonKeyStore` stores and compares this as an iso STRING on purpose — iso
   *         stamps are lexicographically sortable, so the store compares it directly against
   *         a stamp of the current clock rather than parses either side
   * .note = no caller was broken by the lie, because each hands the value to `new Date(...)`,
   *         which takes either. but `number` invited `expiresAt - Date.now()` — which
   *         compiles, yields `NaN`, and caught the author of this note mid-way through a ttl
   *         clamp test (rule.require.shapefit: a type that does not fit is a defect, whether
   *         or not it has bitten yet)
   */
  expiresAt: IsoTimeStamp;
}

/**
 * .what = send GET command to daemon to retrieve keys by slug
 * .why = reads credentials from daemon memory for tool access
 *
 * .note = org filter: only returns keys where key.org matches requested org OR key.org is '@all'
 * .note = env filter: only returns keys where key.env matches requested env OR key.env is 'all'
 * .note = reach filter: selects the key cut for THAT reach. an ask with a reach never
 *         matches a reachless key, and an ask with none never matches a reach key — they
 *         are different keys, so neither can stand in for the other (e6, e8)
 * .note = owner derives socketPath if socketPath not provided
 * .note = daemon implements env=all fallback: org.test.KEY → org.all.KEY
 */
export const daemonAccessGet = async (input: {
  slugs: string[];
  org?: string;
  env?: string;
  reach?: KeyrackKeyReach;
  owner?: string | null;
  socketPath?: string;
}): Promise<{ keys: DaemonKeyRow[] } | null> => {
  // derive socketPath from owner if not provided
  const socketPath =
    input.socketPath ?? getKeyrackDaemonSocketPath({ owner: input.owner });

  // check if daemon is reachable first
  const reachable = await isDaemonReachable({ socketPath });
  if (!reachable) {
    return null; // daemon not found, caller should fall through to other vaults
  }

  const socket = await connectToKeyrackDaemon({ socketPath });

  const response = await sendKeyrackDaemonCommand<{ keys: DaemonKeyRow[] }>({
    socket,
    command: 'GET',
    payload: {
      slugs: input.slugs,
      org: input.org,
      env: input.env,
      reach: input.reach,
    },
  });

  if (!response.success) {
    throw new MalfunctionError('daemon GET command failed', {
      error: response.error,
    });
  }

  return response.data!;
};
