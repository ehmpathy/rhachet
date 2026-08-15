import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import {
  type CloneReachState,
  computeCloneReachState,
} from './computeCloneReachState';
import { getCloneSocketPath } from './getCloneSocketPath';
import { isCloneLive } from './isCloneLive';
import { isCloneProcessLive } from './isCloneProcessLive';

/**
 * .what = probe a clone's reach-state (LIVE | DEAD | DEAF) — the impure
 *   caller that pairs the two liveness probes with the pure classifier
 * .why =
 *   - `list`, `say`, and `get` all need "can i reach this clone?" a SOCKET clone's
 *     liveness is its socket connectability (isCloneLive); a SOCKETLESS clone's is
 *     its process liveness (isCloneProcessLive) — so a socketless clone reads DEAF
 *     while its process is active, and DEAD once it exits (the wisher's transition).
 *     each fact is handed to the pure computeCloneReachState, so the probes and the
 *     classification stay cleanly split (rule.forbid.inline-decode-friction)
 *
 * .note = only the RELEVANT probe runs per branch: a socketless clone (or a
 *   non-POSIX host where the socket path is null) skips the socket connect and
 *   probes its process pid; a socket clone probes its socket and never its pid (a
 *   socket clone's liveness IS its socket, F4)
 */
export const getCloneReachState = async (input: {
  clone: CloneOndisk;
}): Promise<CloneReachState> => {
  const socketPath = getCloneSocketPath({ serial: input.clone.serial });

  // socketless (or no POSIX socket path) → DEAF while its process is active,
  // DEAD once that process has exited
  if (!input.clone.socketEligible || socketPath === null)
    return computeCloneReachState({
      socketEligible: false,
      socketLive: false,
      processLive: isCloneProcessLive({ clone: input.clone }),
    });

  // socket clone → LIVE while the socket answers, DEAD once it does not
  const socketLive = await isCloneLive({ socketPath });
  return computeCloneReachState({
    socketEligible: true,
    socketLive,
    processLive: false,
  });
};
