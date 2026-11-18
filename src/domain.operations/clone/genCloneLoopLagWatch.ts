import { performance } from 'node:perf_hooks';

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
 * .note = `trace` is injected, so the drift line is provable with no spy on `process.stderr`.
 *   the daemon passes its log-only sink (`getOneCloneTraceSinkForDaemon`): the line is for a
 *   reader of the trace log, never for the human's pane
 * .note = the line carries two measures of the tick span beside its drift, so a reader can
 *   tell WHY the loop ran late — the drift alone reads the same for every cause:
 *   - `cpu` = process cpu (user + system) over the span. process-wide, so gc, the libuv
 *     threadpool, and native threads add to it
 *   - `loop active` = main-loop busy time over the span (`eventLoopUtilization`); time the loop
 *     sat in its poll is idle
 *   ⇒ active ≈ drift, cpu ≈ drift → the daemon ran its own sync work on the loop
 *   ⇒ active ≈ drift, cpu ≪ drift → the loop sat in a blocked sync call (a tty or fs write)
 *   ⇒ active ≪ drift → the loop waited in its poll and was woken late: the host starved it
 *   🟡 a host that preempts the daemon MID-callback reads as busy time, so that starvation shows
 *     as active ≈ drift, cpu ≪ drift — the blocked-call shape. cpu ≪ drift rules out the daemon's
 *     own work either way; to tell a blocked call from a mid-callback preempt needs a host read
 *     (load, run queue) beside the line
 */
export const genCloneLoopLagWatch = (input: {
  /**
   * .what = the sink each drift line goes to — the daemon's durable trace log in prod
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
  // .note = deliberate mutation — the previous tick's wall clock, process cpu, and loop
  //   utilization: the state a drift measurement and its class need; local to this closure
  // .note = the monotonic clock, the same one `eventLoopUtilization` reads: a wall clock step
  //   (ntp, a vm resume) must never read as a stall
  let tickedAt = performance.now();
  let cpuAt = process.cpuUsage();
  let loopAt = performance.eventLoopUtilization();

  const timer = setInterval(() => {
    const now = performance.now();
    const drift = asLoopDriftMs({ now, tickedAt, tickMs: input.tickMs });
    const cpu = process.cpuUsage(cpuAt);
    const loop = performance.eventLoopUtilization(loopAt);
    tickedAt = now;
    cpuAt = process.cpuUsage();
    loopAt = performance.eventLoopUtilization();

    if (drift >= input.lagThresholdMs)
      input.trace(
        asCloneLoopStallLine({
          driftMs: drift,
          cpuMs: asCpuTimeMs({ cpu }),
          loopActiveMs: asLoopActiveMs({ loop }),
        }),
      );
  }, input.tickMs);

  timer.unref();

  return { stop: () => clearInterval(timer) };
};

/**
 * .what = how late a tick fired past its scheduled interval
 * .why = the drift is the span the loop could not turn: the wall time since the prior tick,
 *   less the interval the tick was due after
 */
const asLoopDriftMs = (input: {
  now: number;
  tickedAt: number;
  tickMs: number;
}): number => Math.round(input.now - input.tickedAt - input.tickMs);

/**
 * .what = process cpu time over a span, in whole milliseconds
 * .why = `process.cpuUsage` reports user and system time apart, in microseconds; the stall line
 *   wants their sum, in the unit its drift uses
 */
const asCpuTimeMs = (input: { cpu: NodeJS.CpuUsage }): number =>
  Math.round((input.cpu.user + input.cpu.system) / 1000);

/**
 * .what = the main loop's busy time over a span, in whole milliseconds
 * .why = `eventLoopUtilization` reports a fractional `active` in ms; the stall line wants whole ms,
 *   beside its drift and cpu
 */
const asLoopActiveMs = (input: { loop: { active: number } }): number =>
  Math.round(input.loop.active);

/**
 * .what = the one stall line, with its drift and the two measures that classify it
 * .why = one owner of the line's shape, so the watch reads as a narrative and a reader of the
 *   log can match the line whole
 */
const asCloneLoopStallLine = (input: {
  driftMs: number;
  cpuMs: number;
  loopActiveMs: number;
}): string =>
  `clone daemon event loop stalled ${input.driftMs}ms (cpu ${input.cpuMs}ms, loop active ${input.loopActiveMs}ms)\n`;
