import { chmodSync } from 'node:fs';
import { createServer, type Server, type Socket } from 'node:net';
import { asCloneDispatchAckFrame } from './asCloneDispatchAckFrame';
import { asCloneDispatchFrame } from './asCloneDispatchFrame';
import { asCloneDispatchFrameSplit } from './asCloneDispatchFrameSplit';
import { computeCloneSubmitDelay } from './computeCloneSubmitDelay';
import { CLONE_SUBMIT, CLONE_WIRE_FRAME_MAX_BYTES } from './constants';
import { type CloneWriteQueue, genCloneWriteQueue } from './genCloneWriteQueue';
import { isCallerSameUser } from './isCallerSameUser';
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
export const genCloneSocketServer = (input: {
  socketPath: string;
  write: (bytes: string) => void;
  isBrainCliAlive: () => boolean;
}): { server: Server; queue: CloneWriteQueue; close: () => Promise<void> } => {
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
          process.stderr.write(
            `clone socket auth error: ${(err as Error).message}\n`,
          );
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
        process.stderr.write(
          `clone socket connection error: ${code ?? err.message}\n`,
        );
      socket.destroy();
    });
  });

  server.listen(input.socketPath, () => {
    // owner-only — the fs perm twin of the same-user gate
    chmodSync(input.socketPath, 0o600);
  });

  const close = (): Promise<void> =>
    new Promise((done) => {
      queue.drain('clone socket server closed');
      // destroy any still-open connection so server.close() can actually settle — a
      // peer that never disconnects would otherwise hold the close callback forever
      for (const socket of openSockets) socket.destroy();
      server.close(() => done());
    });

  return { server, queue, close };
};
