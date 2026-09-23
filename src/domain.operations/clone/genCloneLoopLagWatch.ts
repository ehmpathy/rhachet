/**
 * .what = watch this process's event loop for a STALL, and trace each one with the drift it
 *   measured — so a daemon that went deaf because its loop never ran says so
 * .why =
 *   - 🔴 a clone daemon with one blocked event loop is INDISTINGUISHABLE, from the client's
 *     seat, from a healthy daemon that chose not to answer. the client sees a connected
 *     socket, a written frame, and no reply — the exact shape of the measured 30s wedge
 *     (`acksSeen: []`, `silentMs: 30013`), and the exact shape a probe read shows too
 *     (`clone get read timed out { replyMs: 5000 }`)
 *   - every OTHER cause names itself already: an auth refusal NACKs, a content gate NACKs,
 *     a dead brain-cli NACKs, a frame past the cap NACKs. so the one class with no voice is
 *     the class where NO handler ran — and an unobservable stall is a failhide
 *     (`rule.forbid.failhide`)
 *   - it is the one measurement that PARTS the two open classes: the loop stalled (a drift
 *     line lands) against the loop was healthy and the frame never arrived (no drift line,
 *     so the silence sits in the socket or the client). a cure guessed before that fork is
 *     settled is a mechanism inferred from an outcome
 *     (`rule.forbid.mechanism-inferred-from-outcome`)
 *
 * .note = the timer is `unref`'d, so this watch can never hold the daemon open past the
 *   clone's own exit — a diagnostic must not change the lifecycle it observes
 * .note = node fires a missed interval ONCE on unblock rather than replays every skipped
 *   tick, so a 30s block reports as one line with a ~30s drift rather than 60 lines
 * .note = `trace` is injected, exactly as the four peer clone operations inject it
 *   (getCloneTraceSink), so the drift line is provable with no spy on `process.stderr`
 */
export const genCloneLoopLagWatch = (input: {
  /**
   * .what = the sink each drift line goes to — the operator's stderr in prod
   */
  trace: (line: string) => void;

  /**
   * .what = how often the watch wakes, in ms
   * .why = it measures its OWN lateness, so the period is the sample rate rather than a
   *   bound. a period far below the stall we hunt (tens of seconds) costs the loop one
   *   timer callback per tick and reports the stall within one period of its end
   */
  tickMs: number;

  /**
   * .what = the drift past which a tick is reported, in ms
   * .why = a healthy loop drifts by a scheduler quantum — single-digit ms — so a bound
   *   well above that keeps the channel silent until a real stall lands. a chatty
   *   diagnostic is one an operator learns to skip
   */
  lagThresholdMs: number;
}): { stop: () => void } => {
  // .note = deliberate mutation — the previous tick's wall clock, the one piece of state a
  //   drift measurement needs; local to this closure and never escapes
  let tickedAt = Date.now();

  const timer = setInterval(() => {
    const now = Date.now();
    const drift = now - tickedAt - input.tickMs;
    tickedAt = now;

    if (drift >= input.lagThresholdMs)
      input.trace(`clone daemon event loop stalled ${drift}ms\n`);
  }, input.tickMs);

  timer.unref();

  return { stop: () => clearInterval(timer) };
};
