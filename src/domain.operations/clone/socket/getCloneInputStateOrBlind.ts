import { getCloneTraceSink } from '../getCloneTraceSink';
import type { CloneGetReply } from './asCloneGetReply';
import { CloneWireCorruptionError } from './CloneWireCorruptionError';
import { getCloneInputState } from './getCloneInputState';
import { isCodeDefectError } from './isCodeDefectError';

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
 * .note = the split is THREE-valued, an allowlist that reserves the degrade for transport faults
 *   alone: a `CloneWireCorruptionError` rethrows (a protocol defect), a JS-defect class
 *   (TypeError / RangeError / ReferenceError / SyntaxError — a genuine code bug) rethrows and
 *   crashes LOUD, and only a transport fault (a socket hiccup, a timeout) degrades to probe-blind.
 *   without the defect rethrow a real bug in the probe path would fold into `feed-not-live` and
 *   report the mildest "wait, it self-heals" remedy about a genuine defect (`rule.forbid.failhide`,
 *   r002-i010-n3, a sharper cut of r011-i008-r001-n1). the transport degrade that remains is STILL
 *   traced to the operator's stderr the instant it is caught, before the probe-blind reply — the
 *   same injected-sink shape genCloneScreenFeed's `retainFault` uses (r011-i007-n4). `traceToStderr`
 *   is INJECTED so a clamp captures it without a spy on the process; a transient transport fault
 *   degrades to the caller and self-heals on the next poll, but leaves a trace a debugger can read
 */
export const getCloneInputStateOrBlind = async (input: {
  socketPath: string;
  message?: string;
  debug?: boolean;
  content?: boolean;
  connectTimeoutMs?: number;
  replyTimeoutMs?: number;
  traceToStderr?: (line: string) => void;
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
    // a wire-corruption fault is a real protocol defect — never mask it as a benign degrade
    if (error instanceof CloneWireCorruptionError) throw error;

    // a JS-defect class (TypeError, RangeError, ReferenceError, SyntaxError) is a genuine CODE
    // bug in the probe path (getCloneInputState's internals, the frame reassembler, a future
    // edit) — never a transport fault. it must crash LOUD, never fold into the mildest
    // "wait, self-heals" degrade that would report a code bug as a benign probe-blind read
    // (rule.forbid.failhide). only a transport fault (connect refused, timeout, socket error —
    // the MalfunctionError getCloneInputState mints) is legitimately probe-blind. this is the
    // allowlist the two-valued split lacked: corruption + defect rethrow, transport degrades
    // (r002-i010-n3)
    if (isCodeDefectError(error)) throw error;

    // a transport fault (connect refused, timeout, socket error) is legitimately probe-blind —
    // but trace it before the degrade, so a non-transport defect folded into `feed-not-live`
    // leaves a loud trail rather than hides behind the mildest remedy (rule.forbid.failhide)
    const traceToStderr = input.traceToStderr ?? getCloneTraceSink();
    const message = error instanceof Error ? error.message : String(error);
    traceToStderr(
      `😶 clone probe fault — degraded to feed-not-live (may self-heal on the next poll): ${message}\n`,
    );

    return { probe: 'unsupported', reason: 'feed-not-live' };
  }
};
