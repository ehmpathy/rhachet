/**
 * .what = the reach-state of a clone — can a caller talk to it, and how?
 * .why = the talk verbs + `list` render need ONE vocabulary for "can i reach
 *   this?"; three states cover it, and the type is shared so no caller invents
 *   a fourth. the three form a say-ability ladder:
 *     - LIVE = a dispatch socket answers → `say` lands, `get` observes
 *     - DEAF = never had a socket AND its process is still ALIVE → `say` is
 *       refused (it "can't hear you"), but `get` still observes its transcript
 *       (observe-only). DEAF is TRANSIENT — an active-but-deaf state
 *     - DEAD = finished / gone → a socket clone whose brain-cli exited (socket
 *       gone), OR a socketless clone whose process has exited. a fresh `say`
 *       cannot land; `get` observes whatever transcript remains
 */
export type CloneReachState = 'LIVE' | 'DEAD' | 'DEAF';

/**
 * .what = classify a clone's reach-state from its socket-eligibility + the two
 *   liveness facts (its socket's, and its process's)
 * .why =
 *   - a SOCKET clone's liveness is DERIVED from the socket, never stored (F4):
 *     it is LIVE while the socket is connectable, DEAD once it is not
 *   - a SOCKETLESS clone (a plain-spawn fallback, a non-capable brain, a
 *     non-POSIX host, a headless spawn) can never hear a `say`, so while its
 *     process is active it is DEAF (active-but-deaf, observe-only) — but once
 *     that process EXITS it is DEAD, exactly like a finished socket clone. so
 *     DEAD means "finished / gone" for EVERY clone; DEAF is the transient
 *     active-but-deaf state, NOT a permanent one (the wisher, 2026-08-13:
 *     "mute clones should be marked dead once they're done")
 *
 * .note = pure: the impure probes (is the socket connectable? is the process
 *   alive?) are getCloneReachState's job; this classifies the already-probed
 *   facts. `socketLive` is meaningful only when `socketEligible`; `processLive`
 *   only when NOT (the branch each feeds)
 */
export const computeCloneReachState = (input: {
  socketEligible: boolean;
  socketLive: boolean;
  processLive: boolean;
}): CloneReachState => {
  // had a socket — LIVE while it answers, DEAD once it does not
  if (input.socketEligible) return input.socketLive ? 'LIVE' : 'DEAD';

  // never had a socket — DEAF while the process is active, DEAD once it exits
  return input.processLive ? 'DEAF' : 'DEAD';
};
