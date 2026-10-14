import { getCloneTraceSink } from '../getCloneTraceSink';
import type { CloneGetReply } from './asCloneGetReply';
import { CloneSocketGoneError } from './CloneSocketGoneError';
import { CloneWireCorruptionError } from './CloneWireCorruptionError';
import { getCloneInputState } from './getCloneInputState';
import { isCloneProbeTransportFault } from './isCloneProbeTransportFault';

/**
 * .what = probe a clone's input state; a transient TRANSPORT fault degrades to a probe-blind
 *   reply rather than a throw — a `getCloneInputState` that never rejects on a socket hiccup.
 *   a genuine WIRE-CORRUPTION fault is NOT degraded: it propagates, so a protocol defect stays
 *   loud
 * .why = a probe is reached on two hot paths that must NOT crash on a socket hiccup: the
 *   pre-dispatch baseline (a throw there crashes a say BEFORE it dispatches) and the observe
 *   loop (a throw there crashes a say whose message already landed). both are the exact
 *   false-failure-on-a-landed-message class this wish exists to kill (r008-i004-b1), so a
 *   TRANSPORT throw (connect refused, timeout, socket error) is caught ONCE here and degraded
 *   to `{ probe: 'unsupported', reason: 'feed-not-live' }`. the degrade is honest and safe:
 *   `feed-not-live` is the milder "wait, may still have landed" remedy, a probe-blind baseline
 *   collapses to a NULL baseline (`computeCloneSayBaseline`, r006-i010-b1 — explicitly NOT zero),
 *   and `asCloneObservationScreen` asserts a rise ONLY against a non-null baseline, so a
 *   probe-blind probe mints no verdict and a prior tick's echo cannot forge a false `enqueued`;
 *   a probe-blind observe verifies by transcript regardless (case=4, V7). a transient fault
 *   self-heals on the next poll; a persistent one lands on `unreadable` at the bound — never a crash
 *
 * .note = a `CloneWireCorruptionError` (bad json, malformed payload, unknown probe — our own
 *   protocol violated) is re-thrown, never degraded. to fold it into `feed-not-live` would tell
 *   the human "no action needed, the read self-heals" about a real protocol defect that never
 *   self-heals — the exact hidden-defect class `rule.forbid.failhide` forbids, one layer above
 *   the `asCloneGetReply` validation built to fail loud on it (r011-i006-b1)
 *
 * .note = `connectTimeoutMs` / `replyTimeoutMs` forward to `getCloneInputState` unchanged (both
 *   default there when omitted). a poll loop passes a bounded `replyTimeoutMs` so one slow probe
 *   cannot eat a large share of its budget — an unforwarded probe rode the 5000ms default, so a
 *   host-load stall (the F14 auth-gate `ss` shell-out) collapsed the loop's intended cadence
 *   (r011-i007-n2). a bound past its budget is safe: the fault degrades probe-blind here, never
 *   crashes the loop
 *
 * .note = the split is an allowlist that reserves the degrade for transport faults alone: a
 *   `CloneWireCorruptionError` rethrows (a protocol defect), a transport fault the probe path
 *   mints (`isCloneProbeTransportFault`: a gone socket, a connect fault, a read timeout or socket
 *   error) degrades to probe-blind, and EVERY other error rethrows and crashes LOUD — a JS defect,
 *   an unknown class, a plain Error. so a real bug in the probe path never folds into
 *   `feed-not-live` (`rule.forbid.failhide`, r002-i010-n3, r002-i002 of the seeds round). the
 *   transport degrade that remains is STILL
 *   traced the instant it is caught, before the probe-blind reply — the same injected-sink shape
 *   genCloneScreenFeed's `retainFault` uses (r011-i007-n4). `traceFault` is INJECTED so a clamp
 *   captures it without a spy on the process, and so a caller whose stderr is a machine channel
 *   (`clone say`) routes it to the durable trace log alone; the default is the stderr+log tee
 *
 * .note = a GONE socket (`CloneSocketGoneError` — the path absent, or the connect refused)
 *   degrades to `socket-gone`, never `feed-not-live`: no listener means the clone ended, and a
 *   wait never clears that. the say poll stops on it at once, and a `/exit` whose socket then
 *   closes reads as the clone that ended as asked (`exited`), never as a probe fault
 */
export const getCloneInputStateOrBlind = async (input: {
  socketPath: string;
  message?: string;
  debug?: boolean;
  content?: boolean;
  connectTimeoutMs?: number;
  replyTimeoutMs?: number;
  traceFault?: (line: string) => void;
}): Promise<CloneGetReply> => {
  try {
    return await getCloneInputState({
      socketPath: input.socketPath,
      message: input.message,
      debug: input.debug,
      content: input.content,
      connectTimeoutMs: input.connectTimeoutMs,
      replyTimeoutMs: input.replyTimeoutMs,
    });
  } catch (error) {
    // a wire-corruption fault is a real protocol defect — never mask it as a benign degrade.
    //   it extends MalfunctionError, so it is checked before the transport allowlist below
    if (error instanceof CloneWireCorruptionError) throw error;

    // only a transport fault the probe path mints is legitimately probe-blind; every other
    //   error — a JS defect, an unknown class, a plain Error — is thrown up loud, never folded
    //   into the mildest "wait, self-heals" degrade (rule.forbid.failhide)
    if (!isCloneProbeTransportFault({ error })) throw error;

    // a transport fault (connect refused, timeout, socket error) is legitimately probe-blind —
    // but trace it before the degrade, so a non-transport defect folded into a probe-blind
    // reason leaves a trail rather than hides behind the mildest remedy (rule.forbid.failhide).
    // a GONE socket (no listener) is named apart: it never self-heals, so a poll stops on it
    const traceFault = input.traceFault ?? getCloneTraceSink();
    const message = error instanceof Error ? error.message : String(error);
    const reason =
      error instanceof CloneSocketGoneError ? 'socket-gone' : 'feed-not-live';
    traceFault(
      reason === 'socket-gone'
        ? `😶 clone probe fault — degraded to socket-gone (no listener; the clone ended): ${message}\n`
        : `😶 clone probe fault — degraded to feed-not-live (may self-heal on the next poll): ${message}\n`,
    );

    return { probe: 'unsupported', reason };
  }
};
