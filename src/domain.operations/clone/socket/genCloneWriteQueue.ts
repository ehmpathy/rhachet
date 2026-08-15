import { CLONE_WRITE_QUEUE_MAX_DEPTH } from './constants';

/**
 * .what = one message queued for the single-writer queue, with its ack callbacks
 */
export interface CloneWriteQueueItem {
  message: string;
  onQueued: () => void;
  onDelivered: () => void;
  onRejected: (reason: string) => void;
}

export interface CloneWriteQueue {
  enqueue: (item: CloneWriteQueueItem) => void;
  drain: (reason: string) => void;
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
 */
export const genCloneWriteQueue = (input: {
  write: (message: string) => void | Promise<void>;
  maxDepth?: number;
}): CloneWriteQueue => {
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
    await input.write(item.message);
    item.onDelivered();

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
      if (closed) return item.onRejected('clone is stopped');

      // past the depth cap, refuse rather than grow an unbounded backlog
      if (queue.length >= maxDepth)
        return item.onRejected(
          `write queue is full (cap ${maxDepth}) — retry once the clone drains`,
        );

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
