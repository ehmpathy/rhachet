import type { DaemonActivityClock } from '../domain.objects/daemonActivityClock';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';
import type { DaemonRenewalRecord } from '../domain.objects/daemonRenewalRecord';
import { getOneDurationMsFromEnv } from './getOneDurationMsFromEnv';

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
  // .why = the read half of the renewal record only: a held renew entry is purpose. an
  // active one may be past expiry after a sleep, owed a renew on the next tick; a
  // stopped one (lapsed or halted) must stay visible in status until a human acts
  renewalRecord: Pick<DaemonRenewalRecord, 'size'>;
}): NodeJS.Timeout => {
  const { keyStore, activity, renewalRecord } = input;

  // env vars allow shorter interval + window for integration tests
  const checkIntervalMs = getOneDurationMsFromEnv({
    envVar: 'KEYRACK_DAEMON_TERMINATION_CHECK_MS',
    fallbackMs: 15 * 60 * 1000, // 15min default
  });
  const idleTimeoutMs = getOneDurationMsFromEnv({
    envVar: 'KEYRACK_DAEMON_IDLE_TIMEOUT_MS',
    fallbackMs: 15 * 60 * 1000, // 15min default
  });

  return setInterval(() => {
    // entries() purges expired keys as side effect
    const entries = keyStore.entries();

    // survive while live keys are held, whatever the query rate
    if (entries.length > 0) return;

    // survive while a renewal record is held, live grant or not
    if (renewalRecord.size() > 0) return;

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
