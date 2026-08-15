import { ConstraintError } from 'helpful-errors';

import { computeCloneUnreachableHint } from '../computeCloneUnreachableHint';
import { asCloneDispatchAck } from './asCloneDispatchAck';
import { asCloneDispatchFrameSplit } from './asCloneDispatchFrameSplit';
import { computeCloneWedgedTimeout } from './computeCloneWedgedTimeout';
import { connectToClone } from './connectToClone';
import { CLONE_WIRE_FRAME_MAX_BYTES } from './constants';

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
 *   is the `get`-poll's job). a rejected NACK (full queue, unsafe content) or either
 *   timeout is a ConstraintError that names the fix
 */
export const sayClone = async (input: {
  socketPath: string;
  message: string;
  connectTimeoutMs?: number;
  wedgedTimeoutMs?: number;
}): Promise<void> => {
  const socket = await connectToClone({
    socketPath: input.socketPath,
    timeoutMs: input.connectTimeoutMs ?? 2000,
  });

  // the in-flight window must OUTLAST the send: the server bulk-writes the content then
  // submits with a `\r` after a length-scaled submit delay, so `delivered` fires only
  // after that whole sequence — a long message legitimately takes (submit-delay) longer.
  // a fixed window would false-wedge a large-but-healthy send; the length-scaled default
  // stays longer than the true send time (floor 30s for short prompts).
  const wedgedMs =
    input.wedgedTimeoutMs ??
    computeCloneWedgedTimeout({ messageLength: input.message.length });

  return new Promise<void>((done, fail) => {
    // .note = deliberate mutation — two latches local to this promise executor: a
    //   reassembly buffer for the ack stream, and the in-flight wedge timer handle
    //   (cleared on settle); neither escapes, so no external reader observes them
    let buffered = '';
    let wedgeTimer: NodeJS.Timeout | null = null;

    const finish = (act: () => void): void => {
      if (wedgeTimer) clearTimeout(wedgeTimer);
      socket.destroy();
      act();
    };

    // arm the in-flight window at write time; each ack re-judges it
    const armWedge = (): void => {
      if (wedgeTimer) clearTimeout(wedgeTimer);
      wedgeTimer = setTimeout(() => {
        // the wedged message + fix come from the ONE hint selector, so the copy
        // has a single owner and a `--output json` consumer reads metadata.hint
        // (never a null hint for the two dispatch faults) — asCliErrorJson
        const { message, hint } = computeCloneUnreachableHint({
          cause: 'wedged',
          hostHash: null,
        });
        finish(() =>
          fail(
            new ConstraintError(message, {
              socketPath: input.socketPath,
              wedgedMs,
              hint,
              reachCause: 'wedged',
            }),
          ),
        );
      }, wedgedMs);
    };

    socket.on('data', (chunk) => {
      const split = asCloneDispatchFrameSplit({
        buffered,
        chunk: chunk.toString('utf8'),
        maxFrameBytes: CLONE_WIRE_FRAME_MAX_BYTES,
      });
      buffered = split.rest;

      for (const frame of split.frames) {
        const ack = asCloneDispatchAck({ line: frame });

        // queued: the message is in flight — re-arm the wedged window
        if (ack.phase === 'queued') armWedge();

        // delivered: it reached the brain's input — success
        if (ack.phase === 'delivered') return finish(() => done());

        // rejected: the server refused it — fail loud with the server's reason
        if (ack.phase === 'rejected')
          return finish(() =>
            fail(
              new ConstraintError(
                `clone refused the message: ${ack.reason ?? 'no reason given'}`,
                { socketPath: input.socketPath, reason: ack.reason },
              ),
            ),
          );
      }
    });

    socket.once('error', (error) => {
      // a socket error mid-dispatch = the clone exited while the message was in
      // flight; the message + fix come from the ONE hint selector (same as the
      // wedged fault) so metadata.hint is never null for a machine consumer
      const { message, hint } = computeCloneUnreachableHint({
        cause: 'exited-mid-dispatch',
        hostHash: null,
      });
      finish(() =>
        fail(
          new ConstraintError(message, {
            socketPath: input.socketPath,
            cause: error instanceof Error ? error : undefined,
            hint,
            reachCause: 'exited-mid-dispatch',
          }),
        ),
      );
    });

    // send the say request, then arm the in-flight window
    socket.write(
      JSON.stringify({ kind: 'say', message: input.message }) + '\n',
    );
    armWedge();
  });
};
