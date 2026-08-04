/**
 * .what = tracks when the daemon last received demand from a client
 * .why = the daemon exits when no client has asked it for work in a while; demand
 *        is the honest proxy for purpose, where key *history* is not
 *
 * .note = key history cannot separate "unlock inbound" from "no client ever came" —
 *         both read as zero keys. "has a client asked me for work" separates them exactly
 * .note = starts at daemon start, so a fresh daemon gets a full idle window as
 *         startup grace before it can be considered idle
 * .note = two words, one concept, and they are not synonyms: *demand* is what is
 *         recorded (a client asked for work); the *activity clock* is what records it.
 *         so prose about the exit rule says demand, and the identifier says activity
 */
export interface DaemonActivityClock {
  /**
   * .what = mark that demand was received right now
   */
  touch: () => void;

  /**
   * .what = read the monotonic ms stamp of the last demand
   *
   * .note = monotonic, NOT epoch. the value is meaningful only as a difference
   *         against another read of the same clock; it is not a wall-clock time and
   *         must never be formatted, stored, or compared against a Date
   */
  getLastAt: () => number;
}

/**
 * .what = build an activity clock, started at now
 * .why = the daemon needs a demand signal that is live from birth, so that a
 *        never-unlocked daemon can still reach its exit branch
 *
 * .note = the source is performance.now() — a monotonic clock — never Date.now().
 * the quantity here is *elapsed duration since an event*, which is exactly what a
 * monotonic clock measures. wall clock would leave the exit rule at the mercy of
 * ntp sync, vm suspend/resume, and manual clock sets: a backward jump makes the
 * idle delta negative, so the daemon never exits — the immortal keyless daemon this
 * whole operation exists to retire, re-created by a clock adjustment.
 * .note = key TTLs stay on the wall clock (daemonKeyStore holds iso stamps), and that
 * is not an inconsistency: a TTL is an *absolute deadline* — a key granted until 5pm
 * expires at 5pm however the process measures elapsed time — while this is an
 * *elapsed duration*. two different quantities, two correct clocks
 * .note = the *global* performance, deliberately, not an import from node:perf_hooks.
 * jest's fake timers patch globalThis.performance; a module-scoped import escapes them,
 * so it would leave this clock frozen under fake timers and the two exit-path unit cases
 * would pass or fail for reasons unrelated to the code under test
 */
export const genDaemonActivityClock = (): DaemonActivityClock => {
  // .note = deliberate mutation: the last-demand stamp is mutable state by nature —
  // a clock whose value never changes is not a clock. it is confined to this closure
  // and reachable only through the two methods below, so no caller holds a reference
  // to it and no caller can write it except via touch(). an immutable form would have
  // to return a *new* clock per touch, which would push the same mutation up into
  // whoever holds the handle — the daemon server — where it would be shared rather
  // than confined. the mutation is kept here precisely to keep it small
  let lastAt = performance.now();

  return {
    touch: () => {
      // .note = deliberate mutation: see above
      lastAt = performance.now();
    },
    getLastAt: () => lastAt,
  };
};
