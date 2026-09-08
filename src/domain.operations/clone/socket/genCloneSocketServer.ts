import { MalfunctionError } from 'helpful-errors';

import { chmodSync, unlinkSync } from 'node:fs';
import { createServer, type Server, type Socket } from 'node:net';
import { asCloneDispatchAckFrame } from './asCloneDispatchAckFrame';
import { asCloneDispatchFrame } from './asCloneDispatchFrame';
import { asCloneDispatchFrameSplit } from './asCloneDispatchFrameSplit';
import { computeCloneSubmitDelay } from './computeCloneSubmitDelay';
import { CLONE_SUBMIT, CLONE_WIRE_FRAME_MAX_BYTES } from './constants';
import {
  CLONE_SOCKET_BIND_TIMEOUT_MARK,
  CLONE_SOCKET_BIND_TIMEOUT_MS,
} from './constants.bind';
import { type CloneWriteQueue, genCloneWriteQueue } from './genCloneWriteQueue';
import { isCallerSameUser } from './isCallerSameUser';
import { isCloneSocketBindFaultError } from './isCloneSocketBindFaultError';
import { isSafeCloneDispatchInput } from './isSafeCloneDispatchInput';

/**
 * .what = stand up one clone's dispatch socket server — accepts same-user `say`
 *   messages, gates their content, verifies a live brain-cli is behind the
 *   socket, serializes them through the write queue, and answers with a two-phase ack
 * .why =
 *   - this IS the reach surface's server half: a `say` lands here, is checked, is
 *     written whole to the child, and is acked. the ONLY action it lets a caller
 *     take is to place a gated message on the brain's input — never touch the
 *     wider terminal (the scoped-to-one-brain safety premise)
 *   - the auth + content gates run server-side, per connection and per frame, so
 *     no client can bypass them
 *   - INVARIANT (define.invariant.clone-socket-brain-cli-only): a `say` is
 *     accepted ONLY when `isBrainCliAlive()` confirms the brain-cli is still the
 *     live peer. if it is not, the message is NACK'd and never written — so a
 *     socket whose brain-cli has exited can never carry input to a raw terminal
 *     or a stray process. paired with the content gate (plain text only), this is
 *     the whole "no shell access via a dead/deaf clone's socket" guarantee
 *
 * .note = `write` is injected (the child's pty write in prod, a capture in a
 *   test), so the server is provable without a real brain. the returned `queue`
 *   is drained on clone exit so no caller hangs on an ack
 * .note = the same-user check is deferred to the FIRST data frame — a bare
 *   liveness probe (connect + close, no bytes) never pays the `ss` lookup
 */
export const genCloneSocketServer = (
  input: {
    socketPath: string;
    write: (bytes: string) => void;
    isBrainCliAlive: () => boolean;
  },
  options?: {
    /**
     * .what = override the bind liveness bound, in ms
     * .why = the DEFAULT is the only value production uses. this exists so a clamp can
     *   prove the bound's own hazard — that a HEALTHY bind is never stalled by its own
     *   guard — on a timescale a test can wait through. a bound of ten seconds cannot be
     *   exercised in a suite, and an unexercised guard is one nobody can show is correct
     */
    bindTimeoutMs?: number;

    /**
     * .what = the sink this module's DIAGNOSTIC trace lines go to
     * .why = every trace here is a line no caller can observe — an auth fault, a late bind,
     *   a reap that could not unlink, and above all the `ready.catch` that exists precisely
     *   for the case where NO caller awaits. so the only way to prove any of them is to read
     *   the sink, and the only way to read the sink with no mock is to inject it.
     *
     * ⚠️ this is NOT `input.write` — that one writes INTO the child's pty and is the
     *   dispatch path. this one is the operator's stderr and carries no dispatch.
     *
     * .note = the DEFAULT is the only value production uses, exactly as `bindTimeoutMs`
     *   above. a `jest.spyOn(process.stderr, 'write')` would be a mock in an integration
     *   test, which `rule.forbid.integration.mocks` forbids outright
     */
    trace?: (line: string) => void;
  },
): {
  server: Server;
  queue: CloneWriteQueue;
  ready: Promise<void>;
  close: () => Promise<void>;
} => {
  // the diagnostic trace sink — real stderr in prod, a capture in a clamp
  const traceToStderr = process.stderr.write.bind(process.stderr);
  const trace = options?.trace ?? traceToStderr;

  // the queue BULK-writes each accepted message to the child in ONE pty write, then —
  // after a length-scaled submit delay — writes the submit `\r`. a booted claude accepts
  // a bulk content write (proven real-haiku 2026-08-13, lesson.clone-say-bulk-write-works);
  // the OLD char-at-a-time cadence was unnecessary and made a long `say` ~30s. the submit
  // delay lets claude commit the pasted buffer before the Enter (a `\r` in the SAME read as
  // the content submits an empty line), and it SCALES with length because a larger paste
  // takes longer to commit (computeCloneSubmitDelay). the queue AWAITS this whole sequence,
  // so the next message never overlaps this submit.
  const queue = genCloneWriteQueue({
    write: async (message) => {
      input.write(asCloneDispatchFrame({ message }));
      await new Promise<void>((done) =>
        setTimeout(
          done,
          computeCloneSubmitDelay({ messageLength: message.length }),
        ),
      );
      input.write(CLONE_SUBMIT);
    },
  });

  const reply = (
    socket: Socket,
    phase: 'queued' | 'delivered' | 'rejected',
    reason: string | null,
  ): void => {
    if (socket.writable)
      socket.write(asCloneDispatchAckFrame({ ack: { phase, reason } }));
  };

  // track accepted connections so close() can destroy any still-open one. node's
  // server.close() callback only fires once EVERY open connection has ended on its
  // own, so a peer that lingers (a stalled comms-relay reader) would hold close()
  // forever — and finalize()/dispose() in genBrainCliPtyClone gate on it, so the
  // clone would never settle its exit, which breaks the "no orphan socket" guarantee
  // .note = deliberate mutation — a per-server connection tracker, added on connect +
  //   removed on close (and drained in close()); local to this closure, never escapes
  const openSockets = new Set<Socket>();

  const server = createServer((socket) => {
    openSockets.add(socket);
    socket.on('close', () => openSockets.delete(socket));

    // .note = deliberate mutation — a per-connection reassembly buffer local to this
    //   handler; it holds the SOCK_STREAM remainder between chunks and never escapes
    let buffered = '';

    // split one chunk into frames, gate each, and enqueue the accepted ones. this
    // is the sync per-chunk work; it runs ONLY after the async same-user gate has
    // resolved (below), so `buffered` is mutated in strict arrival order
    const processChunk = (text: string): void => {
      const split = asCloneDispatchFrameSplit({
        buffered,
        chunk: text,
        maxFrameBytes: CLONE_WIRE_FRAME_MAX_BYTES,
      });
      buffered = split.rest;

      // an unbounded tail past the cap — refuse and hang up
      if (split.overflow) {
        reply(socket, 'rejected', 'message exceeds the frame cap');
        socket.destroy();
        return;
      }

      for (const frame of split.frames) {
        // parse the request; a malformed one is rejected, not crashed on
        // .note = deliberate mutation — assigned once inside the try (a JSON.parse
        //   that may throw); bounded to this loop iteration, never escapes
        let request: { kind?: unknown; message?: unknown };
        try {
          request = JSON.parse(frame);
        } catch {
          reply(socket, 'rejected', 'request is not valid json');
          continue;
        }

        if (request.kind !== 'say' || typeof request.message !== 'string') {
          reply(socket, 'rejected', 'request is not a say { message }');
          continue;
        }

        // the content gate — only plain text + SGR color may reach the child
        if (!isSafeCloneDispatchInput({ message: request.message })) {
          reply(
            socket,
            'rejected',
            'message carries disallowed terminal control',
          );
          continue;
        }

        // the brain-cli-liveness gate — refuse unless a brain-cli is verifiably
        // the live peer. a socket whose brain-cli has exited must NEVER carry a
        // dispatch (a write to a defunct pty, or worse a stray process), so a say
        // here is NACK'd, never written (define.invariant.clone-socket-brain-cli-only)
        if (!input.isBrainCliAlive()) {
          reply(socket, 'rejected', 'no live brain-cli behind this socket');
          continue;
        }

        const { message } = request;
        queue.enqueue({
          message,
          onQueued: () => reply(socket, 'queued', null),
          onDelivered: () => reply(socket, 'delivered', null),
          onRejected: (reason) => reply(socket, 'rejected', reason),
        });
      }
    };

    // the same-user gate runs ONCE per connection, deferred to the first data frame
    // (a bare liveness probe pays no `ss` cost) and ASYNC — the cred lookup shells
    // out to `ss`, so a sync call would freeze this process (the human's pty mirror)
    // and every other clone connection. each chunk chains behind this one promise in
    // arrival order, so frames never process before the peer is authed, and the
    // event loop is never blocked. a lookup fault fails CLOSED (deny), surfaced once
    // .note = deliberate mutation — a per-connection latch local to this handler; it
    //   holds the single in-flight auth promise so chunks chain in order, never escapes
    let authGate: Promise<boolean> | null = null;
    socket.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      if (!authGate)
        authGate = isCallerSameUser({ socket }).catch((err: unknown) => {
          trace(`clone socket auth error: ${(err as Error).message}\n`);
          return false;
        });
      authGate
        .then((ok) => {
          if (!ok) {
            socket.destroy();
            return;
          }
          processChunk(text);
        })
        .catch(() => socket.destroy());
    });

    // a peer that hangs up mid-stream is NORMAL (EPIPE/ECONNRESET/ECONNABORTED) —
    // tear that connection down quietly, and never crash the server for the other
    // callers. but a swallow-all handler would hide a genuinely unexpected
    // transport fault (EACCES, EBADF, …), so surface those to stderr first — they
    // leave a trace to diagnose, then the socket is destroyed either way.
    socket.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      const isPeerHangup =
        code === 'EPIPE' || code === 'ECONNRESET' || code === 'ECONNABORTED';
      if (!isPeerHangup)
        trace(`clone socket connection error: ${code ?? err.message}\n`);
      socket.destroy();
    });
  });

  // 🚨 the bind's two faults take ONE path out, and neither may escape as an uncaught
  //   event. `net.Server` reports a bind fault (EADDRINUSE, EACCES, ENOENT) on `'error'`
  //   ASYNCHRONOUSLY, and a throw inside this callback is SYNCHRONOUS inside an event
  //   handler — so with no listener and no guard, either one kills the process with a
  //   raw stack, ahead of every classifier this repo owns. the caller races `'error'`
  //   against the bind's success event, so the guard re-emits rather than throws: one
  //   fault channel, one owner, and `genCloneSpawn`'s allowlist reports it as OURS
  //
  // 🚨 `ready` OWNS the first fault, and the race for it lives HERE rather than in each
  //   caller. a caller-side race is a contract no signature states and no compiler checks,
  //   so a caller that does not race turns this guard's consume into a silent hang
  //   (`rule.forbid.failhide`). one module, one implementation, every caller.
  //
  // 🚨 the listener is DURABLE (`.on`, never `.once`) because node REMOVES a `.once` after
  //   the first fault — so a SECOND fault on the same server would reach no listener and
  //   die as an uncaught exception. a second fault is real, not hypothetical: a bind can
  //   fault, settle `ready`, and the deferred lockdown below can then fault too.
  //
  //   ⚠️ it does not SWALLOW. the first fault rejects `ready`, which the caller reports
  //   through the classifier — to print it here too would double every enroll failure.
  //   every fault PAST the first has no owner by construction, so it is written to stderr
  //   rather than dropped: a trace, never a vanish (`rule.forbid.failhide`).
  // .note = deliberate mutation — two bindings local to this closure: whether `ready` has
  //   settled, and the handle that settles it. neither escapes
  let readySettled = false;
  let failReady: (error: Error) => void = () => {};
  const ready = new Promise<void>((done, fail) => {
    failReady = fail;

    /**
     * .what = lock the bound socket down to owner-only, then settle `ready` — or, if the
     *   lockdown faults, tear the socket down and reject `ready` with that fault
     *
     * 🚨 the lockdown runs INSIDE the ready gate, never in `listen(path, cb)`'s callback:
     *   node registers that callback as one more `'listening'` listener, behind the gate's
     *   own, so it runs strictly AFTER `readySettled` is true. a lockdown fault there would
     *   miss `failReady`, fall to the durable listener's bare-stderr branch, and leave the
     *   caller's `await ready` already resolved — so the enroll emits its `🔌 reach this
     *   clone` breadcrumb for a server this code had just closed (`rule.forbid.failhide`),
     *   and `'chmod'`'s entry in `isCloneSocketBindFaultError`'s allowlist becomes a
     *   classification no path can reach. run here, the fault settles `ready` and the
     *   caller reports it through the classifier.
     *
     * ⚠️ it REJECTS, never throws. this body runs inside an event handler, where a
     *   synchronous throw has no catch above it and becomes an uncaught exception.
     */
    const lockdownThenSettle = (): void => {
      // 🚨 the bind LANDED LATE — past the bound below, which already rejected `ready` and
      //   reaped. this listener is still registered, so without this branch a late bind
      //   runs a full second teardown whose `fail` hits an ALREADY-REJECTED promise and is
      //   a no-op: node reports naught, the caller hears naught, and the log is identical
      //   to a bind that never landed at all. those are two different facts about the host
      //   — one says libuv is slow, the other says it is deaf — and a reader who cannot
      //   part them cannot act on either (`rule.forbid.failhide`).
      //
      // ⚠️ the reap REPEATS rather than trusts the bound's: `server.close()` ran before
      //   this bind completed, so the listener and its socket file may both be live now.
      //   an un-reaped late bind costs an ORPHAN — a live listener with no owner — so the
      //   repeat is the safe side of the trade
      //
      // 🚨 `server.close()` is NOT idempotent. node emits `ERR_SERVER_NOT_RUNNING` on a
      //   close of a server that is not running, which the durable `'error'` listener below
      //   would absorb into a spurious `clone socket server error` line — noise on the
      //   failure path, and a process death the day that listener's registration order
      //   changes. so the close is GATED on the bind being live
      //
      // ⚠️ the unlink stays unconditional, because it IS idempotent — it guards ENOENT,
      //   and the socket file can outlive a closed listener
      if (readySettled) {
        trace(
          `clone socket bind landed AFTER its ${
            options?.bindTimeoutMs ?? CLONE_SOCKET_BIND_TIMEOUT_MS
          }ms bound and was reaped: ${input.socketPath}\n`,
        );
        if (server.listening) server.close();
        try {
          unlinkSync(input.socketPath);
        } catch (unlinkError) {
          if ((unlinkError as NodeJS.ErrnoException).code !== 'ENOENT')
            trace(
              `clone socket late-bind reap could not unlink ${input.socketPath}: ${
                (unlinkError as NodeJS.ErrnoException).code ??
                (unlinkError as Error).message
              }\n`,
            );
        }
        return;
      }

      try {
        // owner-only — the fs perm twin of the same-user gate
        chmodSync(input.socketPath, 0o600);
      } catch (error) {
        // ⚠️ a socket bound but NOT locked down is worse than an absent one — it is
        //   reachable by any user on the host. so this closes rather than degrades, and
        //   the close precedes the report so no caller can observe the unlocked window
        server.close();

        // ⚠️ and the ADDRESS is released too, never left behind. `server.close()` unbinds
        //   the listener; it does not guarantee the path is unlinked across node versions
        //   and platforms. a socket file that outlives its server is an ORPHAN — it holds
        //   an address a later bind must first clear, and this module's own docblock states
        //   a "no orphan socket" guarantee. so the lockdown failure cleans up after itself
        //   rather than lean on the next caller's stale-path delete
        //
        // ⚠️ ENOENT is the one errno allowed to pass: the file may never have been created,
        //   and an absent file IS the state this seeks. every other errno is written to
        //   stderr, so a genuine fs defect is never masked by the cleanup — but it does NOT
        //   displace the rejection below, because the LOCKDOWN fault is the one the caller
        //   must act on and a promise settles exactly once (`rule.forbid.failhide`)
        try {
          unlinkSync(input.socketPath);
        } catch (unlinkError) {
          if ((unlinkError as NodeJS.ErrnoException).code !== 'ENOENT')
            trace(
              `clone socket lockdown reap could not unlink ${input.socketPath}: ${
                (unlinkError as NodeJS.ErrnoException).code ??
                (unlinkError as Error).message
              }\n`,
            );
        }

        readySettled = true;
        fail(error as Error);
        return;
      }

      readySettled = true;
      done();
    };

    if (server.listening) return lockdownThenSettle();
    server.once('listening', lockdownThenSettle);

    // 🚨 the third outcome: NEITHER event fires. libuv gives one or the other for a unix
    //   bind under every condition we can name — but "we can name" is the whole caveat, and
    //   an enroll that hangs forever behind a spawned child is the worst of the three
    //   shapes: no report, no exit, and a brain-cli that holds the host's pty invisibly
    //
    // ⚠️ the bound is generous ON PURPOSE. a unix bind is a filesystem operation measured
    //   in microseconds, so a threshold in SECONDS cannot kill a healthy-but-slow bind —
    //   the one hazard a timeout carries
    //
    // ⚠️ it fails LOUD and names its own condition, so a human never reads a bare stall.
    //   the timer is `unref`d — a settled `ready` must never hold the event loop open
    const bindTimeoutMs =
      options?.bindTimeoutMs ?? CLONE_SOCKET_BIND_TIMEOUT_MS;
    const timer = setTimeout(() => {
      // ⚠️ inert once `ready` has settled — a `fail` on a settled promise is a no-op — but
      //   kept as the EXPLICIT statement of the invariant, so a later shape that CAN
      //   re-settle (a deferred, an emitter) does not silently inherit a guarantee it no
      //   longer provides. it is not a clamp-provable line, and it is not meant to be
      if (readySettled) return;
      readySettled = true;
      // 🚨 the error is STAMPED so `isCloneSocketBindFaultError` recognizes it as one of
      //   its own. without the mark it carries no `syscall` — node declared no call, which
      //   is the condition itself — so both allowlists in `genCloneSpawn` miss and it takes
      //   the `neither → unclassified` row. this fault is OURS by construction: this module
      //   mints it, above the allowlist that same module closes, so it is anticipated
      //   rather than unknown
      //
      // ⚠️ `MalfunctionError`, never a bare `Error` (`rule.forbid.helpful-error-parents`) —
      //   a caller that awaits `ready` outside `genCloneSpawn`'s allowlist still receives an
      //   error that carries an owner and an exit code. the MARK stays an own property, so
      //   `isCloneSocketBindFaultError`'s realm-independent read is unaffected by the class
      const error = new MalfunctionError(
        `clone socket bind neither succeeded nor faulted within ${bindTimeoutMs}ms`,
        { socketPath: input.socketPath, bindTimeoutMs },
      );
      Object.assign(error, { [CLONE_SOCKET_BIND_TIMEOUT_MARK]: true });
      fail(error);

      // 🚨 the bound REAPS, it does not merely report. node emits the bind's success event
      //   asynchronously, so a bind slow enough to trip this bound can still land after it
      //   — and by then the caller has already taken the rejection and torn down, so nobody
      //   is left to `close()`. the result is a live listener on a unix address with a
      //   socket file behind it and no owner: the exact orphan this module's own docblock
      //   guarantees against. so the reap is unconditional here
      server.close();
      try {
        unlinkSync(input.socketPath);
      } catch (unlinkError) {
        if ((unlinkError as NodeJS.ErrnoException).code !== 'ENOENT')
          trace(
            `clone socket bind-bound reap could not unlink ${input.socketPath}: ${
              (unlinkError as NodeJS.ErrnoException).code ??
              (unlinkError as Error).message
            }\n`,
          );
      }
    }, bindTimeoutMs);
    timer.unref();
  });

  // ⚠️ a `ready` that NO caller awaits would raise an unhandled rejection on a bind fault
  //   — the same process death, one layer over. so this module marks the rejection handled
  //   itself. a caller that DOES await still receives it, because a rejection is delivered
  //   to every handler, not to the first alone
  //
  // 🚨 it TRACES EVERY shape, classified ones included. three can reject this promise — a
  //   bind fault off the `'error'` channel, the lockdown's `chmod` fault, and the bound's
  //   marked malfunction — and an allowlist that skipped those would be silent in the exact
  //   scenario this handler exists for: no caller, so no report (`rule.forbid.failhide`)
  //
  // ⚠️ there is NO claim latch, though a latch is the obvious cure. every mechanism that
  //   can detect "did a caller take this?" is a worse hazard than the doubling it saves:
  //   - a `get ready()` flips on any plain read — a spread, an `Object.keys`, a debug log —
  //     so an innocuous line would silently disarm a failhide guard, invisibly, at a site
  //     that cannot see it (`rule.forbid.hidden-side-effects`)
  //   - a hand-rolled thenable that latches on `then`/`catch` detects the right act, and
  //     buys it with a re-implementation of promise delivery in the one module whose job is
  //     to make a fault impossible to lose
  //
  //   ⇒ the COST is one raw stderr line ahead of the rendered frame on a failed enroll,
  //   which is additive since it carries node's own errno text. the BENEFIT is that no
  //   fault can be lost by any path, and this handler holds no state a reader can
  //   accidentally change (`rule.require.fewer-paths-via-idempotency`)
  ready.catch((error) => {
    trace(
      `clone socket ready rejected with ${
        isCloneSocketBindFaultError(error)
          ? 'a bind fault'
          : 'an unclassified fault'
      }: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  });

  server.on('error', (error) => {
    if (!readySettled) {
      readySettled = true;
      return failReady(error as Error);
    }
    trace(
      `clone socket server error: ${
        (error as NodeJS.ErrnoException).code ?? (error as Error).message
      }\n`,
    );
  });
  // ⚠️ NO callback here, deliberately: node registers it as one more `'listening'`
  //   listener, behind the ready gate's own, so it would run with `readySettled` already
  //   true and its fault could never reach the caller. the lockdown lives in
  //   `lockdownThenSettle` instead (see that function's note)
  server.listen(input.socketPath);

  const close = (): Promise<void> =>
    new Promise((done) => {
      queue.drain('clone socket server closed');
      // destroy any still-open connection so server.close() can actually settle — a
      // peer that never disconnects would otherwise hold the close callback forever
      for (const socket of openSockets) socket.destroy();
      server.close(() => done());
    });

  return { server, queue, ready, close };
};
