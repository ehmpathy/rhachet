import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { computeCloneUnreachableHint } from '../computeCloneUnreachableHint';
import { asCloneDispatchAck } from './asCloneDispatchAck';
import {
  type CloneWithheldReason,
  isCloneWithheldReason,
} from './computeCloneDispatchPrecheck';
import {
  CLONE_OPERATIONAL_REJECT_COPY,
  computeCloneOperationalRejectClass,
  isCloneOperationalRejectReason,
} from './computeCloneOperationalRejectClass';
import { computeCloneWedgedTimeout } from './computeCloneWedgedTimeout';
import { exchangeOnCloneSocket } from './exchangeOnCloneSocket';

/**
 * .what = the dispatch outcome sayClone reports — the bytes reached the pty, or the
 *   server's dequeue pre-check withheld them with a reason
 * .why = a `withheld` is NOT a reach fault — it is a verdict a caller reports (exit 2,
 *   stderr) and a retry policy branches on, so it RESOLVES here rather than throws. an
 *   operational reject (full queue, drained clone, pty fault), a wedge, or an
 *   exited-mid-dispatch each still throws — those are reach faults, unchanged
 */
export type CloneSayDispatch =
  | { delivered: true }
  | { delivered: false; refusal: CloneWithheldReason };

/**
 * .what = dispatch one message into a live clone and confirm the hand-off — connect,
 *   write the say frame, read the two-phase ack, fail loud on any non-delivery
 * .why =
 *   - this IS the reach surface's client half: a cron/comms/`say` puts a message
 *     on a clone's input with no keyboard. it must confirm the `delivered` ack or
 *     fail loud — never silently drop (rule.forbid.failhide)
 *   - the wedged timeout arms only on the IN-FLIGHT window (after the message is
 *     accepted), so a busy-but-healthy brain that takes a while to accept is never
 *     falsely called wedged
 *
 * .note = `delivered` confirms the bytes were HANDED to the clone's pty input, whole
 *   + in order — NOT that the child process read them (node-pty flushes async with no
 *   consumption signal). so this proves hand-off, never the brain's own reply (that
 *   is the `get`-poll's job). a rejected NACK splits by exit-code semantics: a
 *   caller-amendable reason (unsafe content, bad json) throws ConstraintError (exit 2),
 *   a server-fault reason (dead brain-cli, pty fault, full/drained queue) throws
 *   MalfunctionError (exit 1); a wedge or an exited-mid-dispatch is a server/external
 *   state fault the caller cannot amend, so each throws MalfunctionError (exit 1) too
 */
export const sayClone = async (input: {
  socketPath: string;
  message: string;
  force?: boolean;
  connectTimeoutMs?: number;
  wedgedTimeoutMs?: number;
}): Promise<CloneSayDispatch> => {
  // the in-flight window must OUTLAST the send: the server bulk-writes the content then
  // submits with a `\r` after a length-scaled submit delay, so `delivered` fires only
  // after that whole sequence — a long message legitimately takes (submit-delay) longer.
  // a fixed window would false-wedge a large-but-healthy send; the length-scaled default
  // stays longer than the true send time (floor 30s for short prompts).
  const wedgedMs =
    input.wedgedTimeoutMs ??
    computeCloneWedgedTimeout({ messageLength: input.message.length });

  // 🔴 the ack trail, read ONLY by the wedge report below.
  // .why = a wedge says "the peer did not answer in time" and, without this, cannot say WHICH
  //   silence it was — and the two have opposite causes and opposite repairs:
  //   | the trail | what happened | where to look |
  //   |---|---|---|
  //   | `[]` | the peer accepted the connection and never acked at all | the server's accept path — the request was never dequeued |
  //   | `['queued']` | the peer acked, then went silent for the whole window | the dequeue — its pre-check, its write, or a stalled event loop |
  //   a report that cannot part those sends a reader to the wrong half of the system, which is
  //   the cost `rule.require.failloud` prices: an error names the fix, never only the symptom.
  //   measured 2026-09-18: a joker turn wedged at 30s with the marker LANDED on the brain, and
  //   the report carried `wedgedMs` alone — so the diagnosis had to be guessed rather than read
  //   (`rule.forbid.mechanism-inferred-from-outcome`).
  // .note = deliberate mutation — a bounded ack trail, local to this one dispatch. it holds
  //   PHASES, never message content, so it is safe to surface in an error a caller may log
  const acksSeen: string[] = [];
  // .note = deliberate mutation — the clock of the most recent frame, so the wedge can report
  //   how long the silence actually ran rather than only the window it exhausted
  let lastAckAt: number | null = null;
  const startedAt = Date.now();

  // send the say request; the exchange owns connect + reassembly + settle. this is a
  // LOOP read: a `queued` ack re-arms the in-flight window (a still-live peer), a
  // `delivered` ack settles, a `rejected` ack settles by the split below. `force` rides
  // the frame as a boolean the server's dequeue pre-check reads to override a dirty region
  return exchangeOnCloneSocket<CloneSayDispatch>({
    socketPath: input.socketPath,
    request: {
      kind: 'say',
      message: input.message,
      force: input.force ?? false,
    },
    timeoutMs: wedgedMs,
    connectTimeoutMs: input.connectTimeoutMs,
    onFrame: (frame, ctx) => {
      // parse BEFORE we settle: asCloneDispatchAck throws a MalfunctionError on a corrupt
      // ack line (bad json, unknown phase), and this runs inside the exchange's socket data
      // handler — an uncaught throw there kills the process and leaves this promise unresolved.
      // so route the throw to `fail`, the same shape the get twin uses (getCloneInputState),
      // so a version-skewed or corrupt-wire peer surfaces the classed error on the channel the
      // caller awaits rather than an unhandled crash (rule.forbid.failhide)
      // .note = deliberate local — hold the parse result so a throw routes to `fail`, not done
      let ack: ReturnType<typeof asCloneDispatchAck>;
      try {
        ack = asCloneDispatchAck({ line: frame });
      } catch (error) {
        ctx.finish(() =>
          ctx.fail(
            error instanceof Error
              ? error
              : new MalfunctionError('clone dispatch ack parse failed', {
                  socketPath: input.socketPath,
                  frame,
                }),
          ),
        );
        return;
      }

      // record the phase BEFORE any settle, so the wedge report reads every ack that arrived
      // even when the one that would have settled never did
      acksSeen.push(ack.phase);
      lastAckAt = Date.now();

      // queued: the message is in flight — re-arm the wedged window
      if (ack.phase === 'queued') ctx.rearmTimeout();

      // delivered: the bytes reached the brain's input — hand-off confirmed
      if (ack.phase === 'delivered')
        return ctx.finish(() => ctx.done({ delivered: true }));

      // rejected: split the server's reason. a `withheld` pre-check refusal is a
      // VERDICT the caller reports (a modal, an unrecognized screen, a dirty
      // region) — it resolves with the reason. any other reason is an operational
      // reject, classified by exit-code semantics: a caller-amendable reason (bad
      // input) throws ConstraintError (exit 2); a server-fault reason (a dead
      // brain-cli, a pty fault, a full/drained queue) throws MalfunctionError
      // (exit 1) — rule.require.exit-code-semantics
      if (ack.phase === 'rejected') {
        if (isCloneWithheldReason(ack.reason)) {
          const refusal = ack.reason;
          return ctx.finish(() => ctx.done({ delivered: false, refusal }));
        }
        const reason = ack.reason;
        const copy = isCloneOperationalRejectReason(reason)
          ? CLONE_OPERATIONAL_REJECT_COPY[reason]
          : (reason ?? 'no reason given');
        const cls = computeCloneOperationalRejectClass({
          reason: reason ?? '',
        });
        const metadata = { socketPath: input.socketPath, reason };
        return ctx.finish(() =>
          ctx.fail(
            cls === 'caller-amendable'
              ? new ConstraintError(
                  `clone refused the message: ${copy}`,
                  metadata,
                )
              : new MalfunctionError(
                  `clone refused the message: ${copy}`,
                  metadata,
                ),
          ),
        );
      }
    },
    onTimeout: (ctx) => {
      // the wedged message + fix come from the ONE hint selector, so the copy
      // has a single owner and a `--output json` consumer reads metadata.hint
      // (never a null hint for the two dispatch faults) — asCliErrorJson
      const { message, hint } = computeCloneUnreachableHint({
        cause: 'wedged',
        hostHash: null,
      });
      ctx.finish(() =>
        ctx.fail(
          new MalfunctionError(message, {
            socketPath: input.socketPath,
            wedgedMs,
            hint,
            reachCause: 'wedged',
            // 🔴 WHICH silence it was — see the `acksSeen` declaration for the two causes and
            //   where each sends a reader. an empty trail is a peer that never dequeued; a
            //   `['queued']` trail is a peer that dequeued and then stalled
            acksSeen,
            // how long the silence actually ran, from the last ack (or from the connect when no
            // ack ever came). the window it exhausted is `wedgedMs`; this is the observation,
            // and the two differ whenever a `queued` ack re-armed the timer mid-flight
            silentMs: Date.now() - (lastAckAt ?? startedAt),
          }),
        ),
      );
    },
    onError: (error, ctx) => {
      // a socket error mid-dispatch = the clone exited while the message was in
      // flight; the message + fix come from the ONE hint selector (same as the
      // wedged fault) so metadata.hint is never null for a machine consumer
      const { message, hint } = computeCloneUnreachableHint({
        cause: 'exited-mid-dispatch',
        hostHash: null,
      });
      ctx.finish(() =>
        ctx.fail(
          new MalfunctionError(message, {
            socketPath: input.socketPath,
            cause: error instanceof Error ? error : undefined,
            hint,
            reachCause: 'exited-mid-dispatch',
          }),
        ),
      );
    },
  });
};
