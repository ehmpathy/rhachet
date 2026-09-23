/**
 * .what = the outcome of one connection's same-user auth gate — it passed, it was denied,
 *   or the check never settled inside its bound
 * .why = a boolean cannot carry the third case, and the third case is the defect this module
 *   exists for: a check that never settles is NOT a deny (the caller may be perfectly
 *   legitimate), and it is not a pass. it is a server-side fault the caller must be TOLD
 *   about, so it needs its own word (`rule.forbid.mechanism-inferred-from-outcome`)
 * .note = `fault` carries the thrown error when the check itself threw, so the caller can
 *   trace it; a plain deny and a timeout each carry `null`
 */
export interface CloneAuthGateOutcome {
  verdict: 'pass' | 'deny' | 'timeout';
  fault: Error | null;
}

/**
 * .what = run one connection's same-user auth check under a hard bound, and report which of
 *   the three outcomes happened
 * .why =
 *   - 🔴 the clone socket's accept path writes NO frame until this check settles, so an
 *     unbounded check is an unbounded, unobservable silence: the client sees a connected
 *     peer that never answers and falls to its own 30s wedge timer with an EMPTY ack trail —
 *     a report two hops from its cause. measured 2026-09-18 on an 11-suite clone acceptance
 *     tier against 3 live brains: `acksSeen: []`, `silentMs: 30092`
 *   - the check shells out to `ss -xp` (a scan of every unix socket on the host, each mapped
 *     to the pid that holds it) once per connection, so its cost scales with how busy the
 *     host is — the one input this process does not control
 *   - it fails CLOSED on a throw: an auth check that errored has not proven the caller, so
 *     the safe verdict is `deny`. only a genuinely unsettled check reports `timeout`
 *
 * .note = the check is INJECTED, so this bound is provable without a socket, a host scan, or
 *   a second unix user — a promise that never settles is one line in a test
 *   (`rule.require.dependency-injection`)
 * .note = the timer is `unref`'d, so an unsettled gate can never hold the daemon's event
 *   loop open past the clone's own exit
 */
export const awaitCloneAuthGate = async (input: {
  check: () => Promise<boolean>;
  timeoutMs: number;
}): Promise<CloneAuthGateOutcome> => {
  // .note = deliberate local — the timer handle, so a settled check clears it rather than
  //   leaves it armed for the whole bound (unref keeps it harmless either way, but a
  //   cleared timer keeps a fast test fast)
  let timer: NodeJS.Timeout | null = null;

  const bounded = new Promise<CloneAuthGateOutcome>((settle) => {
    timer = setTimeout(
      () => settle({ verdict: 'timeout', fault: null }),
      input.timeoutMs,
    );
    timer.unref();
  });

  const checked = input
    .check()
    .then(
      (ok): CloneAuthGateOutcome => ({
        verdict: ok ? 'pass' : 'deny',
        fault: null,
      }),
    )
    .catch(
      (error: unknown): CloneAuthGateOutcome => ({
        // fail CLOSED — a check that threw has proven no caller
        verdict: 'deny',
        fault: error instanceof Error ? error : new Error(String(error)),
      }),
    );

  const outcome = await Promise.race([checked, bounded]);
  if (timer) clearTimeout(timer);
  return outcome;
};
