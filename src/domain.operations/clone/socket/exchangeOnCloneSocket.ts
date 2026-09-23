import { asCloneDispatchFrameSplit } from './asCloneDispatchFrameSplit';
import { connectToClone } from './connectToClone';
import { CLONE_WIRE_FRAME_MAX_BYTES } from './constants';

/**
 * .what = the handles a wire-exchange callback settles or continues the exchange through
 * .why = the client-side lifecycle owns the promise + the socket + the timer, so a
 *   caller's per-frame / timeout / error handler needs a seam to settle (done/fail),
 *   to tear down (finish), and to reset the in-flight window (rearmTimeout) — never
 *   direct access to the socket, which the communicator alone owns
 */
export interface CloneWireExchangeContext<T> {
  /** settle the exchange with a value — the first settle wins, later ones no-op */
  done: (value: T) => void;
  /** settle the exchange with a fault — the first settle wins, later ones no-op */
  fail: (error: Error) => void;
  /** clear the timer, destroy the socket, THEN run the settle act (done/fail) */
  finish: (act: () => void) => void;
  /** reset the in-flight window to `timeoutMs` — a `queued` ack re-arms a still-live peer */
  rearmTimeout: () => void;
}

/**
 * .what = the client half of a clone-socket exchange — connect, write ONE framed request,
 *   reassemble the framed reply stream, and drive a caller's terminal predicate to a settle
 * .why =
 *   - `getCloneInputState` (a `probe` read) and `sayClone` (a `say` dispatch) are the SAME
 *     communicator with two request/terminal shapes: connect → local latches + a timer →
 *     a `finish` teardown → `on('data')` reassembly via `asCloneDispatchFrameSplit` →
 *     `once('error')` → one JSON `write`. a protocol change (a heartbeat, a timeout
 *     strategy, a held-connection mode) is then written ONCE here, never hand-replicated
 *   - the exchange owns the connection lifecycle; the caller owns only the payload, the
 *     terminal predicate (single-frame-wins vs loop-until-phase), and the settle actions.
 *     so the socket has a single owner and no caller leaks a live handle
 *
 * .note = the reply stream is reassembled per SOCK_STREAM chunk (a frame may split across
 *   chunks, or two frames coalesce into one), and each whole frame is handed to `onFrame`.
 *   the exchange latches on the FIRST settle: once `finish` runs a `done`/`fail`, no further
 *   frame in the same chunk is dispatched — so a single-frame reader ignores a later frame
 *   and a loop reader stops at its terminal one, both without a per-caller guard
 */
export const exchangeOnCloneSocket = async <T>(input: {
  socketPath: string;
  /** the one framed request written to the socket (serialized as JSON + '\n') */
  request: Record<string, unknown>;
  /** the in-flight window; on elapse `onTimeout` fires. re-armable via `rearmTimeout` */
  timeoutMs: number;
  connectTimeoutMs?: number;
  /** handle one whole reply frame — settle via ctx, or continue (e.g. re-arm on `queued`) */
  onFrame: (frame: string, ctx: CloneWireExchangeContext<T>) => void;
  /** the in-flight window elapsed — build + fail the fault the caller reports */
  onTimeout: (ctx: CloneWireExchangeContext<T>) => void;
  /** the socket faulted mid-exchange — build + fail the fault the caller reports */
  onError: (error: Error, ctx: CloneWireExchangeContext<T>) => void;
}): Promise<T> => {
  const socket = await connectToClone({
    socketPath: input.socketPath,
    timeoutMs: input.connectTimeoutMs ?? 2000,
  });

  return new Promise<T>((done, fail) => {
    // .note = deliberate mutation — three latches local to this executor: a reassembly
    //   buffer for the reply stream, the in-flight timer handle (cleared on settle or
    //   re-arm), and a `settled` latch so the first settle wins and no later frame,
    //   timeout, or error re-settles. none escapes; the returned api exposes only ctx
    let buffered = '';
    let timer: NodeJS.Timeout | null = null;
    let settled = false;

    const finish = (act: () => void): void => {
      if (timer) clearTimeout(timer);
      socket.destroy();
      act();
    };

    const guardedDone = (value: T): void => {
      if (settled) return;
      settled = true;
      done(value);
    };
    const guardedFail = (error: Error): void => {
      if (settled) return;
      settled = true;
      fail(error);
    };

    const rearmTimeout = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => input.onTimeout(ctx), input.timeoutMs);
    };

    const ctx: CloneWireExchangeContext<T> = {
      done: guardedDone,
      fail: guardedFail,
      finish,
      rearmTimeout,
    };

    socket.on('data', (chunk) => {
      // a throw anywhere in frame reassembly or in a caller's onFrame must route to `fail`,
      // never escape the emitter as an uncaughtException that kills the process and leaves
      // the exchange promise unresolved forever. this is the shared safety floor beneath
      // every caller — so a future onFrame edit, a bad deref, or a frame-split overflow
      // cannot re-open the hidden-crash + unresolved-promise hazard that each per-caller
      // parse wrapper closes only locally
      try {
        const split = asCloneDispatchFrameSplit({
          buffered,
          chunk: chunk.toString('utf8'),
          maxFrameBytes: CLONE_WIRE_FRAME_MAX_BYTES,
        });
        buffered = split.rest;

        // hand each whole frame to the caller's terminal predicate. stop the moment the
        // exchange settles, so a single-frame reader ignores a later frame and a loop
        // reader stops at its terminal one (the `return` semantics both callers relied on)
        for (const frame of split.frames) {
          if (settled) break;
          input.onFrame(frame, ctx);
        }
      } catch (error) {
        guardedFail(error instanceof Error ? error : new Error(String(error)));
      }
    });

    socket.once('error', (error) => input.onError(error, ctx));

    // arm the in-flight window, then send the request. no reply can arrive before the next
    // tick, so the arm-then-write order is not observable — it mirrors the read-side path
    rearmTimeout();
    socket.write(JSON.stringify(input.request) + '\n');
  });
};
