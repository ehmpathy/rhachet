import { getCloneTraceSink } from '../getCloneTraceSink';
import type { CloneWithheldReason } from './computeCloneDispatchPrecheck';
import type { CloneOperationalRejectReason } from './computeCloneOperationalRejectClass';
import { CLONE_WRITE_QUEUE_MAX_DEPTH } from './constants';
import { isCodeDefectError } from './isCodeDefectError';

/**
 * .what = the result of one dequeued write — the bytes reached the pty, or the dequeue
 *   pre-check withheld them with a reason
 * .why = the write runs a server-side pre-check at DEQUEUE (the read is current at the write),
 *   so a write no longer always reaches the pty. `delivered: true` = bytes handed off;
 *   `delivered: false` carries the reason the ack relays so a caller branches on it (V15). the
 *   reason is EITHER a `CloneWithheldReason` (a caller-amendable pre-check refusal — a dirty
 *   region, a modal) OR a `CloneOperationalRejectReason` (a server-fault the caller cannot
 *   amend — a faulted screen feed whose grid is in doubt, where the write is withheld to
 *   protect the human's unsubmitted input rather than pasted blind)
 */
export type CloneDispatchWriteOutcome =
  | { delivered: true }
  | {
      delivered: false;
      reason: CloneWithheldReason | CloneOperationalRejectReason;
    };

/**
 * .what = one message queued for the single-writer queue, with its ack callbacks
 */
export interface CloneWriteQueueItem {
  message: string;
  /** whether `--force` rides this dispatch — the dequeue pre-check reads it to override a dirty region */
  force: boolean;
  onQueued: () => void;
  onDelivered: () => void;
  /** a withheld pre-check verdict, or a typed operational reject — never a bare prose string */
  onRejected: (
    reason: CloneWithheldReason | CloneOperationalRejectReason,
  ) => void;
}

export interface CloneWriteQueue {
  enqueue: (item: CloneWriteQueueItem) => void;
  drain: (reason: CloneOperationalRejectReason) => void;
  depth: () => number;
}

/**
 * .what = a single-writer serial queue for one clone's dispatch — writes reach
 *   the child ONE at a time, in order, and drive the two-phase ack
 * .why =
 *   - two concurrent `say`s must never interleave into the child's input. one
 *     writer, one order: each message is written whole before the next starts, so
 *     bytes never garble (matrix 7 — concurrent dispatch)
 *   - the queue is DEPTH-BOUNDED: past the cap it refuses new messages with a
 *     `rejected` ack rather than grow an unbounded backlog behind a slow brain —
 *     the say-side hard twin of the enroll-side soft accrual warn
 *   - on clone exit the queue DRAINS: every queued message gets an immediate
 *     `rejected`, so no caller hangs on an ack that will never come
 *
 * .note = `write` performs the actual framed write to the child; the queue owns
 *   only the order, the cap, and the ack phases. injected, so a test observes the
 *   order without a real pty. it MAY be async — the real write is a two-step
 *   paste-then-submit with a delay between (so the submit lands in its own pty
 *   read), and the queue AWAITS it so `delivered` fires only after the submit and
 *   the next message never overlaps the prior submit
 *
 * .note = a thrown write is TRACED before it is demoted to `pty-write-fault`. the
 *   demote is honest for a real pty fault, but the blanket catch also intercepts a
 *   genuine code defect — a TypeError, a logic bug in the write path — and both
 *   fold to the same mildest `pty-write-fault` slug (re-enroll remedy), which would
 *   hide the defect behind a server-fault reason (`rule.forbid.failhide`). so the
 *   thrown error is traced to the operator's stderr the instant it is caught, before
 *   the ack — the same injected-sink shape `genCloneScreenFeed`'s `retainFault` and
 *   `getCloneInputStateOrBlind` use. the trace DISTINGUISHES a JS-defect class (TypeError
 *   / RangeError / ReferenceError / SyntaxError — a code bug) from a real pty fault, so a
 *   defect earns a louder "FIX THE BUG" trace rather than the mildest re-enroll line
 *   (r002-i010-n2). the demote still fires for BOTH (V15 — every dequeue exit MUST ack and
 *   release the drain latch, or a rethrow would wedge the queue), but it leaves a trace a
 *   debugger can read. `traceToStderr` is INJECTED so a clamp captures it without a spy
 *   on the process
 */
export const genCloneWriteQueue = (input: {
  write: (dispatch: {
    message: string;
    force: boolean;
  }) => CloneDispatchWriteOutcome | Promise<CloneDispatchWriteOutcome>;
  maxDepth?: number;
  traceToStderr?: (line: string) => void;
}): CloneWriteQueue => {
  const traceToStderr = input.traceToStderr ?? getCloneTraceSink();
  const maxDepth = input.maxDepth ?? CLONE_WRITE_QUEUE_MAX_DEPTH;
  // .note = deliberate mutation — a serial queue IS mutable state by nature: the
  //   backlog (`queue`), the closed flag, and the drain-loop `active` latch each
  //   change as messages arrive and drain. the mutation is bounded to this
  //   closure (never leaked; the returned api exposes only enqueue/drain/depth),
  //   so no caller can observe or depend on the raw cells — the single-writer
  //   order guarantee relies on exactly this in-place state machine.
  const queue: CloneWriteQueueItem[] = [];
  let closed = false;
  let active = false;

  // process one message per tick, so a synchronous burst can build real depth
  // (the cap is meaningful) and a slow child never interleaves two writes
  const runOne = async (): Promise<void> => {
    const item = queue.shift();
    if (!item) {
      active = false;
      return;
    }

    // write this message whole before the next starts (no interleave). the write is
    // a two-step paste-then-submit with a delay between, so AWAIT it — the next
    // message must not begin its paste while this one's submit is still unresolved,
    // or the two would interleave in the child's input.
    // .note = `delivered` means the message's bytes (paste + submit) were handed to
    //   the pty write — node-pty flushes to the child async with no consumption
    //   signal, so this ack proves HAND-OFF (the message left the queue whole + in
    //   order, and its submit was written), NOT that a frozen brain rendered it. a
    //   stalled brain surfaces as no new `get` activity, not here
    // .note = V15 — EVERY dequeue exit acks and releases the drain latch. the write
    //   may withhold (the dequeue pre-check refused) or throw (a pty fault), and
    //   either one MUST still ack and fall through to the queue-continue below, or a
    //   refused write would leave the clone alive, healthy on reach, yet deaf to `say`
    try {
      const outcome = await input.write({
        message: item.message,
        force: item.force,
      });
      if (outcome.delivered) item.onDelivered();
      else item.onRejected(outcome.reason);
    } catch (error) {
      // a pty write threw — a server fault (MalfunctionError, exit 1), never a
      // caller-amendable input fault. the errno detail is not on the wire reason
      // field; the class + slug are what a caller acts on.
      // trace the thrown error FIRST, and DISTINGUISH a genuine code defect from a
      // real pty fault: a JS-defect class (TypeError / RangeError / ReferenceError /
      // SyntaxError) is a bug in the write / pre-check path, not a pty write fault, so
      // it earns a LOUDER "code defect" trace a debugger cannot miss. V15 forbids a
      // rethrow here (it would wedge the queue's drain latch), so both shapes still
      // demote to `pty-write-fault` and release the latch — but the defect no longer
      // hides behind the mildest server-fault trace (rule.forbid.failhide, r002-i010-n2)
      const message = error instanceof Error ? error.message : String(error);
      const isDefect = isCodeDefectError(error);
      traceToStderr(
        isDefect
          ? `💥 clone write DEFECT — a code bug in the write path, not a pty fault; demoted to pty-write-fault to release the drain latch (V15), but FIX THE BUG: ${message}\n`
          : `💥 clone write fault — demoted to pty-write-fault (re-enroll remedy): ${message}\n`,
      );
      item.onRejected('pty-write-fault');
    }

    if (queue.length > 0) setImmediate(runOne);
    else active = false;
  };

  const kick = (): void => {
    if (active) return;
    active = true;
    setImmediate(runOne);
  };

  return {
    enqueue: (item) => {
      // a closed queue refuses new work — the caller learns at once
      if (closed) return item.onRejected('clone-stopped');

      // past the depth cap, refuse rather than grow an unbounded backlog
      if (queue.length >= maxDepth) return item.onRejected('queue-full');

      // accepted: ack queued now, then write + ack delivered on a later tick
      item.onQueued();
      queue.push(item);
      kick();
    },
    drain: (reason) => {
      closed = true;
      while (queue.length > 0) queue.shift()!.onRejected(reason);
    },
    depth: () => queue.length,
  };
};
