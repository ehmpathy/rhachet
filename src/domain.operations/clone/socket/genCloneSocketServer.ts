import { MalfunctionError } from 'helpful-errors';

import { chmodSync, unlinkSync } from 'node:fs';
import { createServer, type Server, type Socket } from 'node:net';
import { genCloneLoopLagWatch } from '../genCloneLoopLagWatch';
import { getCloneTraceSink } from '../getCloneTraceSink';
import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import { writeCloneTraceLine } from '../writeCloneTraceLine';
import { asCloneDispatchAckFrame } from './asCloneDispatchAckFrame';
import { asCloneDispatchFrame } from './asCloneDispatchFrame';
import { asCloneDispatchFrameSplit } from './asCloneDispatchFrameSplit';
import { asCloneGetReplyFrame } from './asCloneGetReplyFrame';
import { asCloneGetReplyFromScreen } from './asCloneGetReplyFromScreen';
import {
  awaitCloneAuthGate,
  type CloneAuthGateOutcome,
} from './awaitCloneAuthGate';
import {
  awaitCloneSubmitReady,
  getCloneSubmitBaseline,
} from './awaitCloneSubmitReady';
import { computeCloneAcceptRoute } from './computeCloneAcceptRoute';
import { computeCloneScreenDispatchGate } from './computeCloneScreenDispatchGate';
import {
  CLONE_AUTH_GATE_TIMEOUT_MS,
  CLONE_LOOP_LAG_THRESHOLD_MS,
  CLONE_LOOP_LAG_TICK_MS,
  CLONE_SUBMIT,
  CLONE_WIRE_FRAME_MAX_BYTES,
} from './constants';
import {
  CLONE_SOCKET_BIND_TIMEOUT_MARK,
  CLONE_SOCKET_BIND_TIMEOUT_MS,
} from './constants.bind';
import { type CloneWriteQueue, genCloneWriteQueue } from './genCloneWriteQueue';
import { isCallerSameUser } from './isCallerSameUser';
import { isCloneSocketBindFaultError } from './isCloneSocketBindFaultError';

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
    /**
     * .what = read the currently-rendered screen, for a `probe` read
     * .why = a `probe` reads the clone's input state off this rendered grid — never the pty
     *   byte stream (define.pty-stream-vs-screen). REQUIRED (V18): when no emulator is live
     *   the daemon injects a `() => feed-not-live`, so a `probe` degrades honestly (V7) rather
     *   than reads a false state off a blank grid
     */
    read: () => CloneScreenRead;

    /**
     * .what = await the emulator's in-flight parse, so the NEXT `read` reflects every byte
     *   the child has emitted so far
     * .why = the emulator parses ASYNC off the child's stream, so a bare `read` is
     *   point-in-time and the point may PRECEDE a human's latest keystrokes. the dequeue gate
     *   below reads the grid to decide whether the input box is `clear` — so a stale read can
     *   miss a mid-type, call the box clear, and let the write clobber it, which is the exact
     *   case=2 hazard that gate exists to prevent
     * .note = REQUIRED, exactly as `read` is (V18) — when no emulator is live the daemon
     *   injects a no-op, so every construction site states what it models rather than inherits
     *   a default (`rule.forbid.undefined-inputs`)
     * .note = the feed's own settle is BOUNDED, so this await can never wedge the dequeue loop
     */
    settle: () => Promise<void>;
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
  const traceToStderr = getCloneTraceSink();
  const trace = options?.trace ?? traceToStderr;

  // the queue BULK-writes each accepted message to the child in ONE pty write, then — once
  // it OBSERVES the content committed into the input box — writes the submit `\r`. a booted
  // claude accepts a bulk content write (proven real-haiku 2026-08-13,
  // lesson.clone-say-bulk-write-works); the OLD char-at-a-time cadence was unnecessary and
  // made a long `say` ~30s. the Enter must land in a LATER pty read than the content (a `\r`
  // in the SAME read submits an empty line), and the commit interval is the brain's, not
  // ours to predict — so the daemon watches its own live screen for the content rather than
  // sleeps a guessed delay (awaitCloneSubmitReady). the queue AWAITS this whole sequence, so
  // the next message never overlaps this submit.
  const queue = genCloneWriteQueue({
    write: async ({ message, force }) => {
      // the DEQUEUE gate — the read is current at the write now (the queue serialized this
      // write, so a client-side probe taken before enqueue may be stale by up to the queue
      // depth). the gate reads the rendered screen, classifies the input region, and withholds
      // rather than paste blind (V3, case=2, case=6). the three-way decision is extracted so it
      // is unit-testable apart from this socket + queue harness (computeCloneScreenDispatchGate)
      // ⚠️ SETTLE before the read. the queue makes this read CURRENT WITH THE WRITE, which is
      //   not the same as current with the CHILD: the emulator parses async off the child's
      //   stream, so a read taken mid-parse sees a STALE grid. it can miss a human's
      //   just-typed chars, classify the box `clear`, and let this write clobber the mid-type
      //   — the exact case=2 hazard this gate exists to prevent. the settle awaits the
      //   in-flight parse, so the classification reflects every byte received (fulcrum F10;
      //   the drain semantics are MEASURED, `.agent/.notes/tool.probe-xterm-write-drain.js`)
      await input.settle();

      const gate = computeCloneScreenDispatchGate({
        screen: input.read(),
        message,
        force,
      });
      if (!gate.proceed)
        return { delivered: false as const, reason: gate.reason };

      // the baseline count BEFORE the write — the submit waits for a RISE above it, never
      // a presence, so a `--force` write into a box that already holds this text cannot
      // submit early (the repo's rise rule, applied to the write path)
      const countBefore = getCloneSubmitBaseline({
        read: input.read,
        message,
      });

      input.write(asCloneDispatchFrame({ message }));

      // hold the Enter until the content is OBSERVED committed into the box. the retired
      // blind sleep guessed that interval and lost a bracketed paste outright; the daemon
      // already holds the live screen, so the commit is watched rather than predicted. an
      // unreadable feed degrades to that proven sleep (awaitCloneSubmitReady)
      await awaitCloneSubmitReady({ read: input.read, message, countBefore });

      input.write(CLONE_SUBMIT);
      return { delivered: true as const };
    },
  });

  const reply = (
    socket: Socket,
    phase: 'queued' | 'delivered' | 'rejected',
    reason: string | null,
  ): void => {
    // 🔴 an unwritable socket DROPS the ack, and the drop is traced rather than swallowed.
    // .why = the client's whole verdict rests on which acks arrived (`acksSeen`), so a
    //   dropped ack is INDISTINGUISHABLE at the client from a server that never acked —
    //   the exact shape of the measured 30s wedge (`acksSeen: []`, `silentMs: 30013`). the
    //   guard itself is right (a write to a closed socket throws), so the repair is to give
    //   the drop a voice, never to write anyway (`rule.forbid.failhide`)
    if (!socket.writable) {
      trace(
        `clone socket ack dropped — peer no longer writable: ${phase}${
          reason ? ` (${reason})` : ''
        }\n`,
      );
      return;
    }
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
        reply(socket, 'rejected', 'frame-cap-exceeded');
        socket.destroy();
        return;
      }

      for (const frame of split.frames) {
        // classify the frame — parse, kind, content gate, force — with no effect. the pure
        // decision lives in computeCloneAcceptRoute, so the route decision is unit-tested apart
        // from this socket (r011-i007-n3); this loop performs the one effect each route needs
        const routed = computeCloneAcceptRoute({ frame });

        // a malformed / not-a-say / disallowed-control frame is NACK'd, never crashed on. the
        // reason slug is decided by the classifier, in the same order the old inline gates ran
        if (routed.route === 'reject') {
          reply(socket, 'rejected', routed.reason);
          continue;
        }

        // a `probe` is a READ, not a write: it never touches the child's pty, so it bypasses
        // the liveness gate and the write queue. the same-user gate above still applies (a
        // probe is authed like any frame), but a dead brain-cli can still be probed — the read
        // reports feed-not-live or the last screen, never a write to a dead pty
        if (routed.route === 'probe') {
          const getReply = asCloneGetReplyFromScreen({
            screen: input.read(),
            needle: routed.needle,
            debug: routed.debug,
            content: routed.content,
          });
          // the same traced drop as `reply` above — a probe read that is answered into a
          // closed socket reads to the client as `clone get read timed out`, which is one of
          // the two measured symptoms of the wedge under investigation
          if (!socket.writable) {
            trace(
              'clone socket probe reply dropped — peer no longer writable\n',
            );
            continue;
          }
          socket.write(asCloneGetReplyFrame({ reply: getReply }));
          continue;
        }

        // a well-formed `say` — the brain-cli-liveness gate is the one effect the classifier
        // could not own. refuse unless a brain-cli is verifiably the live peer: a socket whose
        // brain-cli has exited must NEVER carry a dispatch (a write to a defunct pty, or worse
        // a stray process), so a say here is NACK'd, never written
        // (define.invariant.clone-socket-brain-cli-only)
        if (!input.isBrainCliAlive()) {
          reply(socket, 'rejected', 'no-live-brain-cli');
          continue;
        }

        queue.enqueue({
          message: routed.message,
          force: routed.force,
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
    //
    // 🔴 the gate is BOUNDED, and every non-pass exit NACKs with a named reason.
    // .why = the accept path writes NO frame until this gate settles, so before the
    //   bound there were two ways for a connection to go permanently silent, and
    //   neither named itself: an `ss` lookup that never settled, and a deny that
    //   destroyed the socket with no reply. the client saw a connected peer that never
    //   answered and fell to its 30s wedge timer with `acksSeen: []` — a report two
    //   hops from its cause (measured 2026-09-18; see CLONE_AUTH_GATE_TIMEOUT_MS). now
    //   a timeout is `auth-gate-timeout` and a deny is `auth-denied`, each a classed
    //   reject the caller reads and acts on (`rule.forbid.failhide`, `rule.require.failfast`)
    // .note = `end()`, never `destroy()`, on each refusal — destroy discards a pending
    //   write, so the NACK just queued would never reach the peer and the fix would
    //   report as the same silence it replaces
    // .note = deliberate mutation — a per-connection latch local to this handler; it
    //   holds the single in-flight auth promise so chunks chain in order, never escapes
    let authGate: Promise<CloneAuthGateOutcome> | null = null;
    socket.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      if (!authGate)
        authGate = awaitCloneAuthGate({
          check: () => isCallerSameUser({ socket }),
          timeoutMs: CLONE_AUTH_GATE_TIMEOUT_MS,
        });
      authGate
        .then((outcome) => {
          if (outcome.fault)
            trace(`clone socket auth error: ${outcome.fault.message}\n`);

          if (outcome.verdict === 'timeout') {
            trace(
              `clone socket auth gate timed out after ${CLONE_AUTH_GATE_TIMEOUT_MS}ms\n`,
            );
            reply(socket, 'rejected', 'auth-gate-timeout');
            socket.end();
            return;
          }
          if (outcome.verdict === 'deny') {
            reply(socket, 'rejected', 'auth-denied');
            socket.end();
            return;
          }
          processChunk(text);
        })
        .catch((error: unknown) => {
          // 🔴 the ONE path in this handler that used to end a connection with no reply and no
          //   trace — `.catch(() => socket.destroy())`. every other exit above either ACKs with a
          //   classed reason or traces, so a connection that went silent had to have come through
          //   here, and here said naught about why (`rule.forbid.failhide`).
          // .why = `processChunk` calls `input.read()`, `asCloneGetReplyFromScreen`,
          //   `computeCloneAcceptRoute`, and `queue.enqueue`. a throw from ANY of them landed
          //   here, so the client saw a peer that accepted its bytes and never answered — and
          //   fell to its 30s wedge timer with `acksSeen: []`. that is the exact measured
          //   signature (2026-09-19: a `get` probe at `replyMs: 5000` and a `say` at
          //   `wedgedMs: 30000` against ONE clone whose loop-lag watch proved the event loop
          //   healthy the whole time — so the silence was never a stalled loop, it was this catch)
          // .note = the NACK goes out BEFORE the teardown, and by `end()` rather than `destroy()`,
          //   because destroy discards a queued write — the same clamp every refusal above carries
          trace(
            `clone socket frame handler threw: ${
              error instanceof Error ? error.message : String(error)
            }\n`,
          );
          reply(socket, 'rejected', 'server-fault');
          socket.end();
        });
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
  // ⚠️ it traces UNCONDITIONALLY, so an awaited fault is reported twice — one raw stderr line
  //   ahead of the rendered frame. that second report is deliberate: do NOT add a claim latch
  //   here (`rule.forbid.hidden-side-effects`)
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

  // 🔴 the loop-lag watch — the one channel that names a daemon gone deaf because its event
  // loop never ran. every other silence on this socket names itself (an auth refusal, a
  // content gate, a dead brain-cli, a frame past the cap, and now a dropped ack above), so
  // the residual class is the one where NO handler ran — and at the client that is
  // indistinguishable from a server that chose not to answer (`rule.forbid.failhide`)
  const loopLagWatch = genCloneLoopLagWatch({
    trace,
    tickMs: CLONE_LOOP_LAG_TICK_MS,
    lagThresholdMs: CLONE_LOOP_LAG_THRESHOLD_MS,
  });

  // 🔴 ONE liveness line per clone lifetime, to the DURABLE LOG ONLY — never stderr.
  // .why = the line exists to make the watch's SILENCE legible: an absent stall line and a
  //   watch that never ran produce the identical log, so a reader who concludes "the loop was
  //   healthy" from silence has inferred a mechanism from an outcome
  //   (`rule.forbid.mechanism-inferred-from-outcome`). that reader reads the LOG
  // .why = stderr is the HUMAN'S TERMINAL, so a `trace` here was the wrong channel. a daemon
  //   inherits the enroller's stderr (`genCloneEnrollDetached`: `stdio: ['ignore','pipe',
  //   'inherit']`), so this line printed ABOVE the `😶 clone enrolled` header on every enroll —
  //   diagnostic prose in the one line a human reads to learn the enroll worked
  //   (`rule.forbid.surprises`). the operator channel and the human's screen are one fd here,
  //   which is the claim `getCloneTraceSink`'s own docblock gets wrong
  // .note = a fault of the durable write IS named on stderr, and that is no failhide of this
  //   line — it reports that the line's ONLY copy was lost, which is the case a reader of the
  //   log must know about before they read its silence as health
  try {
    writeCloneTraceLine({
      repoPath: process.cwd(),
      at: new Date(),
      line: `clone daemon loop watch live (tick ${CLONE_LOOP_LAG_TICK_MS}ms, stall past ${CLONE_LOOP_LAG_THRESHOLD_MS}ms)\n`,
    });
  } catch (error) {
    trace(
      `clone daemon loop watch liveness line could not reach its durable log: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
  }

  const close = (): Promise<void> =>
    new Promise((done) => {
      loopLagWatch.stop();
      queue.drain('clone-drained');
      // destroy any still-open connection so server.close() can actually settle — a
      // peer that never disconnects would otherwise hold the close callback forever
      for (const socket of openSockets) socket.destroy();
      server.close(() => done());
    });

  return { server, queue, ready, close };
};
