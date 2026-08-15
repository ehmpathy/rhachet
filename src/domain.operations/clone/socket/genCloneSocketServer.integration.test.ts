import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { rmSync, writeFileSync } from 'node:fs';
import { connect, createServer, type Server, type Socket } from 'node:net';
import { getCloneSocketPath } from '../getCloneSocketPath';
import { isCloneLive } from '../isCloneLive';
import { asCloneDispatchAckFrame } from './asCloneDispatchAckFrame';
import { genCloneSocketServer } from './genCloneSocketServer';
import { sayClone } from './sayClone';

/**
 * .what = await a net.Server bind, so a connect never races the socket setup
 */
const awaitServerReady = (server: Server): Promise<void> =>
  new Promise((done) => {
    if (server.listening) return done();
    server.once('listening', () => done());
  });

/**
 * .what = stand up a real clone socket server with a capture write sink
 * .why = `isBrainCliAlive` defaults to `() => true` (a live brain-cli behind the
 *   socket, the common case); pass `() => false` to model a socket whose brain-cli
 *   has exited, so the brain-cli-liveness invariant can be exercised
 */
const genServerWithCapture = async (input?: {
  isBrainCliAlive?: () => boolean;
}): Promise<{
  socketPath: string;
  written: string[];
  close: () => Promise<void>;
}> => {
  const socketPath = getCloneSocketPath({ serial: getUuid() })!;
  // .note = deliberate mutation — a local capture of the bytes the server wrote to the
  //   child; pushed in the injected write, read by assertions; never escapes this scene
  const written: string[] = [];
  const { server, close } = genCloneSocketServer({
    socketPath,
    write: (bytes) => written.push(bytes),
    isBrainCliAlive: input?.isBrainCliAlive ?? (() => true),
  });
  await awaitServerReady(server);
  return { socketPath, written, close };
};

describe('genCloneSocketServer.integration', () => {
  given('[case1] a live server with a capture sink', () => {
    const scene = useBeforeAll(async () => genServerWithCapture());
    afterAll(async () => scene.close());

    when('[t0] a plain message is dispatched', () => {
      then(
        'the child was written the message, then a SEPARATE submit `\\r`',
        async () => {
          await sayClone({ socketPath: scene.socketPath, message: 'poke abc' });

          // the content is BULK-written (a booted claude accepts a bulk content write),
          // so the concatenation of all writes is the message followed by the submit `\r`
          expect(scene.written.join('')).toEqual('poke abc\r');

          // the submit `\r` is the LAST write — a DISTINCT keystroke after the content,
          // never bundled into the last content byte (bundled, it rides the same pty
          // read and submits an empty line, so the message is left unsent — the dogfood
          // defect). the message carries no `\r`, so the submit is the ONLY one
          expect(scene.written[scene.written.length - 1]).toEqual('\r');
          expect(
            scene.written.filter((bytes) => bytes === '\r').length,
          ).toEqual(1);
        },
      );
    });
  });

  given('[case2] a message that carries terminal-control', () => {
    const scene = useBeforeAll(async () => genServerWithCapture());
    afterAll(async () => scene.close());

    when('[t0] an unsafe message is dispatched', () => {
      then('sayClone fails loud and the child never received it', async () => {
        const before = scene.written.length;
        const error = await getError(() =>
          sayClone({
            socketPath: scene.socketPath,
            message: 'clear\x1b[2Jscreen',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(scene.written.length).toEqual(before);
      });
    });
  });

  given('[case3] two concurrent dispatches to one clone', () => {
    const scene = useBeforeAll(async () => genServerWithCapture());
    afterAll(async () => scene.close());

    when('[t0] both are dispatched at once', () => {
      const settled = useBeforeAll(async () => {
        await Promise.all([
          sayClone({ socketPath: scene.socketPath, message: 'first' }),
          sayClone({ socketPath: scene.socketPath, message: 'second' }),
        ]);
        return { ok: true };
      });

      then(
        'both landed whole, serialized — each message fully typed then ITS submit',
        () => {
          expect(settled.ok).toBe(true);

          // serialized (single-writer, no interleave): the whole write stream is ONE
          // message typed char-at-a-time + its submit `\r`, THEN the other in full — a
          // byte of message B never lands between message A's content and A's `\r`
          const stream = scene.written.join('');
          expect(['first\rsecond\r', 'second\rfirst\r']).toContain(stream);
        },
      );
    });
  });

  given(
    '[case5] a server that accepts a connection but never acks (wedged)',
    () => {
      when('[t0] a message is dispatched with a short in-flight window', () => {
        then(
          'sayClone fails loud AND the error carries the fix in metadata.hint (for --output json)',
          async () => {
            const socketPath = getCloneSocketPath({ serial: getUuid() })!;
            // a raw server that accepts the connection but sends NO ack, so the
            // in-flight window elapses and the wedged branch fires — the branch
            // whose { message, hint } computeCloneUnreachableHint owns. the accepted
            // sockets are tracked so cleanup can destroy them (else server.close
            // hangs awaiting the lingering peer connection)
            // .note = deliberate mutation — a local list of accepted peer sockets so
            //   cleanup can destroy them; pushed on connect, torn down after; never escapes
            const accepted: Socket[] = [];
            const server = createServer((peer) => accepted.push(peer));
            await new Promise<void>((done) =>
              server.listen(socketPath, () => done()),
            );

            const error = await getError(() =>
              sayClone({ socketPath, message: 'poke', wedgedTimeoutMs: 200 }),
            );

            // before this fix the wedged throw carried no hint — a machine consumer
            // saw a null hint for the most common dispatch fault; now it is threaded
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error).toMatchObject({
              metadata: { reachCause: 'wedged', hint: expect.any(String) },
            });

            accepted.forEach((peer) => peer.destroy());
            await new Promise<void>((done) => server.close(() => done()));
          },
        );
      });
    },
  );

  given('[case7] a server that acks `queued` but never `delivered`', () => {
    when('[t0] the queued acks arrive faster than the in-flight window', () => {
      then(
        'each `queued` re-arms the window, so the wedge fires only after the acks stop — never at the initial window',
        async () => {
          const socketPath = getCloneSocketPath({ serial: getUuid() })!;

          // a raw server that acks `queued` on a heartbeat (150/350/550/750ms)
          // then STOPS — it never sends `delivered`. this is the in-flight shape
          // of a healthy-but-busy brain: it accepted the message (so it is NOT
          // dead), and it keeps up a progress heartbeat, so it must NOT be judged
          // wedged while the beats come. once they stop, the re-armed window
          // elapses and the wedge fires — the two-phase model's whole point.
          // the beats come 200ms apart under a 400ms window, so each has 200ms of
          // slack before the prior deadline — robust against scheduler jitter
          // .note = deliberate mutation — two local accumulators (accepted peer
          //   sockets + their heartbeat timers) so cleanup can tear both down;
          //   pushed on connect, cleared after; never escape this scene
          const accepted: Socket[] = [];
          const beats: NodeJS.Timeout[] = [];
          const server = createServer((peer) => {
            accepted.push(peer);
            for (const at of [150, 350, 550, 750])
              beats.push(
                setTimeout(() => {
                  if (peer.writable)
                    peer.write(
                      asCloneDispatchAckFrame({
                        ack: { phase: 'queued', reason: null },
                      }),
                    );
                }, at),
              );
          });
          await new Promise<void>((done) =>
            server.listen(socketPath, () => done()),
          );

          // with a 400ms window: a broken re-arm would fire at ~400ms (the
          // write-time initial arm), long before the heartbeats stop. a live
          // re-arm pushes the deadline out on every `queued` (last beat at 750ms
          // + 400ms window ≈ 1150ms), so the elapsed time PROVES the re-arm ran
          const startedAt = Date.now();
          const error = await getError(() =>
            sayClone({ socketPath, message: 'poke', wedgedTimeoutMs: 400 }),
          );
          const elapsedMs = Date.now() - startedAt;

          expect(error).toBeInstanceOf(ConstraintError);
          expect(error).toMatchObject({
            metadata: { reachCause: 'wedged' },
          });

          // the bite: the wedge fired WELL past the initial 400ms window, because
          // each `queued` heartbeat re-armed it. revert the `armWedge()` on the
          // queued phase and this drops to ~400ms — the assertion goes red
          expect(elapsedMs).toBeGreaterThanOrEqual(900);

          beats.forEach((beat) => clearTimeout(beat));
          accepted.forEach((peer) => peer.destroy());
          await new Promise<void>((done) => server.close(() => done()));
        },
      );
    });
  });

  given('[case8] a clone that exits the instant the dispatch arrives', () => {
    when('[t0] the socket is accepted but reset before the say lands', () => {
      then(
        'sayClone fails loud with reachCause `exited-mid-dispatch` and a hint (never a false wedge)',
        async () => {
          const socketPath = getCloneSocketPath({ serial: getUuid() })!;

          // a raw server that ACCEPTS the connection (so connectToClone succeeds
          // and the socket file is live) then destroys the peer at once — the
          // clone process died the instant the dispatch arrived. sayClone's
          // upfront write then hits a dead peer (ECONNRESET/EPIPE), so its socket
          // `error` handler fires: this is the `exited-mid-dispatch` fault, NOT a
          // wedge (the wedge is for a live-but-silent brain). the reset must be
          // reported at once, never left to run out the whole in-flight window
          // .note = deliberate mutation — a local list of accepted peer sockets so
          //   cleanup can destroy them; pushed on connect, torn down after; never escapes
          const accepted: Socket[] = [];
          const server = createServer((peer) => {
            accepted.push(peer);
            // the server needs its own error handler or the reset would throw
            peer.on('error', () => undefined);
            peer.destroy();
          });
          await new Promise<void>((done) =>
            server.listen(socketPath, () => done()),
          );

          // a generous wedged window — the point is the reset is reported IMMEDIATELY
          // via the socket-error path, never by a lapse of this timeout (a false wedge)
          const error = await getError(() =>
            sayClone({ socketPath, message: 'poke', wedgedTimeoutMs: 5000 }),
          );

          expect(error).toBeInstanceOf(ConstraintError);
          // the fault is named exited-mid-dispatch (the clone died in flight), and
          // the hint is threaded so a machine consumer (--output json) reads a fix,
          // never a null hint — the same one-owner hint selector the wedge uses
          expect(error).toMatchObject({
            metadata: {
              reachCause: 'exited-mid-dispatch',
              hint: expect.any(String),
            },
          });

          accepted.forEach((peer) => peer.destroy());
          await new Promise<void>((done) => server.close(() => done()));
        },
      );
    });
  });

  given('[case10] a server that fragments the ack across socket writes', () => {
    // a real unix socket may split ONE frame across two `data` events, or coalesce
    // TWO frames into one — sayClone must reassemble via its `buffered` accumulator
    // and still read the `delivered` ack. case1 writes whole frames, so this proves
    // the read path does not silently depend on a frame that lands in a single chunk
    // (a wrong buffer would hang → a false wedge)
    const deliveredFrame = asCloneDispatchAckFrame({
      ack: { phase: 'delivered', reason: null },
    });
    const queuedFrame = asCloneDispatchAckFrame({
      ack: { phase: 'queued', reason: null },
    });

    when('[t0] the delivered ack is SPLIT across two writes', () => {
      then(
        'sayClone reassembles the frame and resolves (no false wedge)',
        async () => {
          const socketPath = getCloneSocketPath({ serial: getUuid() })!;
          // .note = deliberate mutation — a local list of accepted peer sockets so
          //   cleanup can destroy them; pushed on connect, torn down after; never escapes
          const accepted: Socket[] = [];
          const server = createServer((peer) => {
            accepted.push(peer);
            peer.on('error', () => undefined);
            peer.on('data', () => {
              const mid = Math.floor(deliveredFrame.length / 2);
              peer.write(deliveredFrame.slice(0, mid));
              setTimeout(() => peer.write(deliveredFrame.slice(mid)), 20);
            });
          });
          await new Promise<void>((done) =>
            server.listen(socketPath, () => done()),
          );

          // resolves = no throw; a broken `buffered` reassembly would hang until the
          // 3s wedged window, so a generous window that we do NOT reach proves the
          // frame was read from the two fragments
          await sayClone({
            socketPath,
            message: 'poke',
            wedgedTimeoutMs: 3000,
          });

          accepted.forEach((peer) => peer.destroy());
          await new Promise<void>((done) => server.close(() => done()));
        },
      );
    });

    when('[t0] a queued+delivered ack is COALESCED into one write', () => {
      then(
        'sayClone reads BOTH frames from the one chunk and resolves',
        async () => {
          const socketPath = getCloneSocketPath({ serial: getUuid() })!;
          // .note = deliberate mutation — a local list of accepted peer sockets so
          //   cleanup can destroy them; pushed on connect, torn down after; never escapes
          const accepted: Socket[] = [];
          const server = createServer((peer) => {
            accepted.push(peer);
            peer.on('error', () => undefined);
            // both acks in ONE write — the read loop must process each frame the
            // reassembler yields, not just the first, so `delivered` still lands
            peer.on('data', () => peer.write(queuedFrame + deliveredFrame));
          });
          await new Promise<void>((done) =>
            server.listen(socketPath, () => done()),
          );

          await sayClone({
            socketPath,
            message: 'poke',
            wedgedTimeoutMs: 3000,
          });

          accepted.forEach((peer) => peer.destroy());
          await new Promise<void>((done) => server.close(() => done()));
        },
      );
    });
  });

  given('[case9] a `say` to a dead clone (a stale orphan socket file)', () => {
    // usecase.6: a dispatch to a dead clone must FAIL LOUD, never silently drop.
    // a dead clone leaves an un-reaped socket file (the vision does not reap it),
    // so `say` connects to a leftover file where no server listens — sayClone must
    // surface connectToClone's fail-loud, not swallow it into a silent no-op
    when('[t0] a message is dispatched to the orphan socket', () => {
      then(
        'sayClone fails loud — the message is never silently dropped',
        async () => {
          const stalePath = getCloneSocketPath({ serial: getUuid() })!;
          writeFileSync(stalePath, '');

          const error = await getError(() =>
            sayClone({ socketPath: stalePath, message: 'poke' }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect((error as Error).message).toContain(
            'no live clone at this socket',
          );

          rmSync(stalePath, { force: true });
        },
      );
    });
  });

  given('[case6] close() with a peer that never disconnects', () => {
    // the production guarantee: a clone settles its exit + leaves no orphan socket
    // even when a peer (a stalled comms-relay reader) holds a connection open. before
    // the fix, close() only drained the write queue + called server.close(), whose
    // callback waits for EVERY open connection to end on its own — so a peer that
    // stays open held close() forever, and finalize()/dispose() gated on it hung too
    // (i009 r011 blocker 3). the fix destroys tracked open sockets in close()
    when('[t0] a peer connects and stays open, then the server closes', () => {
      then('close() settles (never hangs on the still-open peer)', async () => {
        const scene = await genServerWithCapture();

        // a peer connects and DELIBERATELY never disconnects (the stalled reader)
        const peer = connect(scene.socketPath);
        await new Promise<void>((done, fail) => {
          peer.once('connect', () => done());
          peer.once('error', fail);
        });

        // close() must settle on its own — race it against a fail-loud timeout so a
        // regression (the hang) surfaces as a failed test, not a stalled suite
        const closed = scene.close();
        const timed = new Promise<never>((_done, fail) =>
          setTimeout(
            () => fail(new Error('close() hung on the still-open peer')),
            3000,
          ),
        );
        await Promise.race([closed, timed]);

        peer.destroy();
      });
    });
  });

  given('[case4] socket liveness', () => {
    when('[t0] the server is up', () => {
      then(
        'isCloneLive is true, then false once closed, false for a bogus path',
        async () => {
          const scene = await genServerWithCapture();
          expect(await isCloneLive({ socketPath: scene.socketPath })).toBe(
            true,
          );

          await scene.close();
          expect(await isCloneLive({ socketPath: scene.socketPath })).toBe(
            false,
          );

          const bogus = getCloneSocketPath({ serial: getUuid() })!;
          expect(await isCloneLive({ socketPath: bogus })).toBe(false);
        },
      );
    });
  });

  given(
    '[case11] a live socket whose brain-cli has EXITED (the security invariant)',
    () => {
      // define.invariant.clone-socket-brain-cli-only: a socket that answers but whose
      // brain-cli is gone must NEVER carry a dispatch — else a `say` could reach a
      // defunct pty or a stray process. the server consults isBrainCliAlive per say
      // and NACKs when it is false, so the bytes are never written. this is the whole
      // "no shell access via a dead/deaf clone's socket" guarantee, at the seam
      const scene = useBeforeAll(async () =>
        // the socket is up + connectable, but its brain-cli reports DEAD
        genServerWithCapture({ isBrainCliAlive: () => false }),
      );
      afterAll(async () => scene.close());

      when('[t0] a well-formed, content-safe `say` is dispatched', () => {
        then(
          'it is NACK`d (fail loud) and no byte reaches the peer',
          async () => {
            const before = scene.written.length;
            const error = await getError(() =>
              sayClone({ socketPath: scene.socketPath, message: 'poke abc' }),
            );

            // fail loud — a caller always learns the say did not land
            expect(error).toBeInstanceOf(ConstraintError);
            expect((error as Error).message).toContain('brain-cli');

            // the invariant`s teeth: not one byte reached the write sink. revert the
            // isBrainCliAlive gate in genCloneSocketServer and this say is written
            // char-at-a-time → written.length grows → this assertion goes red
            expect(scene.written.length).toEqual(before);
          },
        );
      });
    },
  );

  given('[case12] a LONG message (delivery preserved at length)', () => {
    // a long message must deliver WHOLE — bulk-written in one pty write, then a submit
    // `\r` after a length-scaled delay (a booted claude accepts a bulk content write, and
    // the delay lets it commit the larger paste before Enter — proven real-haiku
    // 2026-08-13, lesson.clone-say-bulk-write-works). this proves the whole message still
    // lands in order with exactly one submit, regardless of length
    const scene = useBeforeAll(async () => genServerWithCapture());
    afterAll(async () => scene.close());

    when('[t0] a 1500-char message is dispatched', () => {
      const sent = useBeforeAll(async () => {
        const message = 'a'.repeat(1500);
        await sayClone({ socketPath: scene.socketPath, message });
        return { message };
      });

      then('the whole message is written, then ONE submit', () => {
        // delivery preserved AT LENGTH: every char reached the sink, in order, and a
        // single submit `\r` closed it — length never dropped or merged a byte
        expect(scene.written.join('')).toEqual(`${sent.message}\r`);
        expect(scene.written.filter((bytes) => bytes === '\r').length).toEqual(
          1,
        );
      });
    });
  });
});
