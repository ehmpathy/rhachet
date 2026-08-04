import { BadRequestError } from 'helpful-errors';

import type { DaemonActivityClock } from '../domain.objects/daemonActivityClock';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = read a millisecond duration from an env var, or fall back to a default
 * .why = an unparseable override is a silent catastrophe in this file. parseInt
 *        yields NaN, and NaN poisons both durations in opposite, invisible ways:
 *        setInterval(fn, NaN) fires as fast as the loop allows, and `idleMs < NaN`
 *        is always false, so the idle gate no longer holds and every daemon exits
 *        on its first tick. neither raises an error — the daemon simply stops to
 *        serve, and the operator sees a keyrack that forgets its keys instantly
 *
 * .note = caller-fixable (correct the env var) -> BadRequestError, not a server fault
 */
const getOneDurationMs = (input: {
  envVar: string;
  fallbackMs: number;
}): number => {
  const raw = process.env[input.envVar];
  if (!raw) return input.fallbackMs;

  // the whole string must be digits, not merely start with them
  // .why = parseInt is a *prefix* parse: '1.5px' yields 1, so a typo'd unit would
  // silently become a 1ms interval — a busy loop — rather than raise. the shape is
  // verified on the raw string so the leniency cannot reach the duration
  if (!/^\d+$/.test(raw) || parseInt(raw, 10) <= 0)
    throw new BadRequestError(
      `${input.envVar} must be a positive integer of milliseconds`, // e.g. "900000"
      { [input.envVar]: raw },
    );

  return parseInt(raw, 10);
};

/**
 * .what = periodically exit when the daemon holds no keys and has served no demand
 * .why = a daemon no client asks for work serves no purpose; the gate is on *demand*,
 *        not on key history, because history cannot separate a daemon whose unlock is
 *        inbound from one whose client never came — both hold zero keys
 *
 * .note = default idle window and check interval are both 15 minutes, so worst-case
 *         lifetime after the last demand is ~2x the window (tick granularity)
 * .note = KEYRACK_DAEMON_TERMINATION_CHECK_MS / KEYRACK_DAEMON_IDLE_TIMEOUT_MS env vars
 *         allow shorter values for integration tests
 */
export const scheduleAutoTermination = (input: {
  keyStore: DaemonKeyStore;
  // .why = the read half of the clock only. the terminator must never touch(): a tick
  // that marked demand would renew the very lease it reads, and the daemon could never
  // exit — the defect this operation exists to fix, re-created from the inside.
  // Pick makes that a compile error rather than a code review's job
  activity: Pick<DaemonActivityClock, 'getLastAt'>;
}): NodeJS.Timeout => {
  const { keyStore, activity } = input;

  // env vars allow shorter interval + window for integration tests
  const checkIntervalMs = getOneDurationMs({
    envVar: 'KEYRACK_DAEMON_TERMINATION_CHECK_MS',
    fallbackMs: 15 * 60 * 1000, // 15min default
  });
  const idleTimeoutMs = getOneDurationMs({
    envVar: 'KEYRACK_DAEMON_IDLE_TIMEOUT_MS',
    fallbackMs: 15 * 60 * 1000, // 15min default
  });

  return setInterval(() => {
    // entries() purges expired keys as side effect
    const entries = keyStore.entries();

    // survive while live keys are held, whatever the query rate
    if (entries.length > 0) return;

    // survive while demand is recent; the clock starts at daemon start, so this also
    // grants a fresh daemon a full window of startup grace before it can idle out
    // .note = both reads come from the same monotonic source (performance.now), never
    // the wall clock. an ntp sync, a vm resume, or a manual clock set moves Date.now
    // arbitrarily in either direction, and a *backward* move would make this delta
    // negative — so the gate would hold forever and the daemon would never exit. that
    // is the immortal keyless daemon this operation exists to retire, re-created by a
    // clock adjustment. a monotonic source cannot move backward, so it cannot do this
    const idleMs = performance.now() - activity.getLastAt();
    if (idleMs < idleTimeoutMs) return;

    // otherwise: no keys and no demand => no purpose
    console.log('[keyrack-daemon] no keys and no demand, terminate');
    process.exit(0);
  }, checkIntervalMs);
};
