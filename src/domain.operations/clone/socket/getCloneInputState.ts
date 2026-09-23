import { MalfunctionError } from 'helpful-errors';

import { asCloneGetReply, type CloneGetReply } from './asCloneGetReply';
import { CLONE_PROBE_REPLY_DEFAULT_MS } from './constants';
import { exchangeOnCloneSocket } from './exchangeOnCloneSocket';

/**
 * .what = read a clone's input state over its socket — connect, write a `probe` frame,
 *   read one reply, return the classified state or the feed-not-live degrade
 * .why =
 *   - this IS the read channel's client half: `say` leverages it to observe where a
 *     dispatched message sits (buffered / enqueued / released), and a caller polls it
 *     with `--await` until a target state is reached. a probe reads STATE — never bytes
 *     off the pty — so the socket stays scoped to a classification (F03)
 *   - a `probe` is a READ: it bypasses the write queue and the liveness gate server-side,
 *     so a busy or even a dead brain can still be probed. the reply is one frame
 *
 * .note = `message` is the needle the counts tally (countInInput / countOnScreen), sent as
 *   the wire `needle` field. a probe with an empty needle reads focus + input only. a
 *   probe-blind clone (no emulator, or a feed not yet live) replies
 *   `{ probe: 'unsupported', reason: 'feed-not-live' }` — the honest degrade the
 *   `unreadable` verdict rests on, never a false `absent` (V7)
 *
 * .note = `debug` asks the server to attach the RAW rendered grid beside the
 *   classification, for a diagnostic log. OFF by default: a routine read answers with a
 *   classification and no screen bytes (F02/F03), so only a caller that diagnoses its own
 *   dispatch opts in. the grid is never a decision input — every verdict reads `state`
 *
 * .note = `content` is the NARROW opt-in beside that wide one: the two INPUT surfaces (the box,
 *   and the queue when it is non-empty), never the turn output above them. it is what
 *   `clone get --what buffer|queue` reads, and like `debug` it defaults OFF — so a routine
 *   `say` probe still carries a classification alone
 */
export const getCloneInputState = async (input: {
  socketPath: string;
  message?: string;
  debug?: boolean;
  content?: boolean;
  connectTimeoutMs?: number;
  replyTimeoutMs?: number;
}): Promise<CloneGetReply> => {
  const replyMs = input.replyTimeoutMs ?? CLONE_PROBE_REPLY_DEFAULT_MS;

  // send the probe request — needle is the string the counts tally (empty = focus/input only).
  // `probe` is the wire kind (a noun, so no new WRITE verb — F08); the caller-side param
  // stays `message` for symmetry with `say`, mapped to the `needle` field the server reads.
  // the exchange owns connect + reassembly + settle; the probe is a SINGLE-frame read, so the
  // first whole frame settles and the exchange's `settled` latch ignores any later frame
  return exchangeOnCloneSocket<CloneGetReply>({
    socketPath: input.socketPath,
    request: {
      kind: 'probe',
      needle: input.message ?? '',
      debug: input.debug === true,
      content: input.content === true,
    },
    timeoutMs: replyMs,
    connectTimeoutMs: input.connectTimeoutMs,
    onFrame: (frame, ctx) => {
      // parse BEFORE we settle: asCloneGetReply throws a MalfunctionError on a corrupt reply,
      // so route the throw to `fail` — a corrupt wire reply then surfaces as the classed error
      // on the channel the caller awaits, never an unresolved promise (r6-b1)
      // .note = deliberate local — hold the parse result so a throw routes to `fail`, not done
      let reply: CloneGetReply;
      try {
        reply = asCloneGetReply({ line: frame });
      } catch (error) {
        ctx.finish(() =>
          ctx.fail(
            error instanceof Error
              ? error
              : new MalfunctionError('clone get reply parse failed', {
                  socketPath: input.socketPath,
                  frame,
                }),
          ),
        );
        return;
      }
      ctx.finish(() => ctx.done(reply));
    },
    onTimeout: (ctx) =>
      ctx.finish(() =>
        ctx.fail(
          new MalfunctionError('clone get read timed out', {
            socketPath: input.socketPath,
            replyMs,
          }),
        ),
      ),
    onError: (error, ctx) =>
      ctx.finish(() =>
        ctx.fail(
          new MalfunctionError('clone get read failed on the socket', {
            socketPath: input.socketPath,
            cause: error instanceof Error ? error : undefined,
          }),
        ),
      ),
  });
};
