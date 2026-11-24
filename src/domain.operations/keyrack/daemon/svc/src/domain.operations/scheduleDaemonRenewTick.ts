import { now } from 'iso-time';

import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';
import type { DaemonRenewRecord } from '../domain.objects/daemonRenewRecord';
import { getOneDurationMsFromEnv } from './getOneDurationMsFromEnv';
import type { getOneGrantRenewal } from './getOneGrantRenewal';
import { renewDaemonGrantsDue } from './renewDaemonGrantsDue';
import { setAllRenewEntriesHaltedByDefect } from './setAllRenewEntriesHaltedByDefect';

/**
 * .what = run the renew tick on an interval, for the daemon's whole life
 * .why = the daemon is the one process alive across a grant's expiry, so it is the
 *        one that can renew it before the consumer feels the gap. how a grant renews
 *        is its mech adapter's concern; the daemon only keeps the schedule
 *
 * .note = tick = 1m and window = 10m by default. the keyrack already treats < 5m as
 *         expired, so a 10m window leaves several ticks of margin before that line
 * .note = KEYRACK_DAEMON_RENEW_TICK_MS / KEYRACK_DAEMON_RENEW_WINDOW_MS /
 *         KEYRACK_DAEMON_RENEW_TIMEOUT_MS allow shorter values for tests
 * .note = each renew try is bounded by the renew timeout, so a hung upstream call counts as
 *         a fault and can never hold its key's in-flight slot forever
 * .note = a tick never throws out of the interval: every per-key outcome, a defect
 *         included, settles on its own entry inside renewDaemonGrantsDue; only a defect in
 *         the tick's own orchestration reaches the boundary. so one bad key cannot halt its
 *         peers, one bad tick cannot take down the daemon, and no defect goes unnamed
 */
export const scheduleDaemonRenewTick = (input: {
  keyStore: DaemonKeyStore;
  renewRecord: DaemonRenewRecord;
  getOneRenewal: typeof getOneGrantRenewal;
}): NodeJS.Timeout => {
  const tickMs = getOneDurationMsFromEnv({
    envVar: 'KEYRACK_DAEMON_RENEW_TICK_MS',
    fallbackMs: 60 * 1000, // 1min default
  });
  const windowMs = getOneDurationMsFromEnv({
    envVar: 'KEYRACK_DAEMON_RENEW_WINDOW_MS',
    fallbackMs: 10 * 60 * 1000, // 10min default
  });
  const renewTimeoutMs = getOneDurationMsFromEnv({
    envVar: 'KEYRACK_DAEMON_RENEW_TIMEOUT_MS',
    fallbackMs: 2 * 60 * 1000, // 2min default; a silent renew takes seconds
  });

  // the keys mid-renew, shared across ticks so a slow renew never overlaps the next
  // .note = deliberate mutation: renewDaemonGrantsDue adds and removes each address
  const inflight = new Set<string>();

  const handle = setInterval(() => {
    void renewDaemonGrantsDue(
      { now: now() },
      {
        keyStore: input.keyStore,
        renewRecord: input.renewRecord,
        inflight,
        windowMs,
        renewTimeoutMs,
        getOneRenewal: input.getOneRenewal,
      },
    ).catch((defect: unknown) => {
      // .why = the process boundary. only a defect in the tick's own orchestration reaches
      //        here: operational faults and per-key defects settle on their own entry. a
      //        rethrow from a timer would crash the daemon and evict every caller's keys,
      //        so the defect lands as a `halted` mark on each idle unmarked entry, where
      //        `keyrack status` names it
      setAllRenewEntriesHaltedByDefect(
        { defect },
        { renewRecord: input.renewRecord, inflight },
      );
      console.error('[keyrack-daemon] renew tick defect', defect);
    });
  }, tickMs);

  // .why = the renew timer alone must never hold the process open; auto-termination
  //        decides the daemon's life, and the server's socket holds it while it serves
  handle.unref();

  return handle;
};
