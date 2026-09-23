import { ConstraintError, MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  useThen,
  when,
} from 'test-fns';
import { getUuid } from 'uuid-fns';

import { realpathSync, rmSync, writeFileSync } from 'node:fs';
import { connect, createServer, type Socket } from 'node:net';
import { getCloneSocketPath } from '../getCloneSocketPath';
import { isCloneLive } from '../isCloneLive';
import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import { asCloneDispatchAckFrame } from './asCloneDispatchAckFrame';
import { genCloneSocketServer } from './genCloneSocketServer';
import { getCloneInputState } from './getCloneInputState';
import { isCloneSocketBindFaultError } from './isCloneSocketBindFaultError';
import { sayClone } from './sayClone';

/**
 * .what = stand up a real clone socket server with a capture write sink
 * .why = `isBrainCliAlive` defaults to `() => true` (a live brain-cli behind the
 *   socket, the common case); pass `() => false` to model a socket whose brain-cli
 *   has exited, so the brain-cli-liveness invariant can be exercised
 */
const genServerWithCapture = async (input?: {
  isBrainCliAlive?: () => boolean;
  read?: () => CloneScreenRead;
  /**
   * .what = the emulator-parse drain the dequeue gate awaits before it reads
   * .why = a scene that proves the gate READS A SETTLED GRID needs to observe the await —
   *   so it injects a settle that records its own call, or one that mutates the screen a
   *   later `read` returns. the default is a no-op, since most scenes hand back a fixed screen
   */
  settle?: () => Promise<void>;
}): Promise<{
  socketPath: string;
  written: string[];
  /**
   * .what = every diagnostic line the server traced within this scene
   * .why = a scene that proves a fault NAMED ITSELF has to read the trace — the line is the
   *   whole deliverable, and it reaches no caller by any other channel. captured rather than
   *   left to stderr so the assertion can be made in-process
   */
  traced: string[];
  close: () => Promise<void>;
}> => {
  const socketPath = getCloneSocketPath({ serial: getUuid() })!;
  // .note = deliberate mutation — a local capture of the bytes the server wrote to the
  //   child; pushed in the injected write, read by assertions; never escapes this scene
  const written: string[] = [];
  // .note = deliberate mutation — a local capture of the server's diagnostic trace lines;
  //   pushed by the injected sink, read by assertions; never escapes this scene
  const traced: string[] = [];
  const { ready, close } = genCloneSocketServer(
    {
      socketPath,
      write: (bytes) => written.push(bytes),
      isBrainCliAlive: input?.isBrainCliAlive ?? (() => true),
      read: input?.read ?? (() => ({ live: false, reason: 'feed-not-live' })),
      settle: input?.settle ?? (async () => {}),
    },
    { trace: (line) => traced.push(line) },
  );
  // ⚠️ `ready` settles on the bind's success OR its fault — a helper that awaited the
  //   success alone would hang forever on a fault, which is the exact defect the module's
  //   own guard was written to retire
  await ready;
  return { socketPath, written, traced, close };
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
            // saw a null hint for the most common dispatch fault; now it is threaded.
            // wedged is a MalfunctionError (server-must-fix, exit 1) per i010-r001-n3 —
            // the peer went silent mid-dispatch, a fault the caller cannot fix
            expect(error).toBeInstanceOf(MalfunctionError);
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

          // wedged is a MalfunctionError (server-must-fix, exit 1) per i010-r001-n3
          expect(error).toBeInstanceOf(MalfunctionError);
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

          // exited-mid-dispatch is a MalfunctionError (server-must-fix, exit 1) per
          // i010-r001-n3 — the clone died in flight, a fault the caller cannot fix
          expect(error).toBeInstanceOf(MalfunctionError);
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
    // the fix destroys tracked open sockets in close()
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

            // fail loud — a caller always learns the say did not land. a dead
            // brain-cli is a SERVER fault (the clone is defunct, not the caller`s
            // input), so the reject classifies as MalfunctionError (exit 1), never
            // a caller-amendable ConstraintError — rule.require.exit-code-semantics
            expect(error).toBeInstanceOf(MalfunctionError);
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

  given(
    '[case13] a bind that FAULTS, at a caller with no race of its own',
    () => {
      // 🚨 the clamp on a regression this module itself introduced. an earlier shape left
      //   the fault race to the CALLER and kept a counter here that assumed exactly one
      //   caller performed it — an unstated contract no compiler checked. every caller in
      //   this suite awaited the bind's SUCCESS alone, so under that shape a fault was
      //   consumed here as "the caller's" and the await never settled: a LOUD uncaught
      //   crash became a SILENT hang (`rule.forbid.failhide`, from a guard written to
      //   retire it). `ready` now owns the fault, so no caller can be wrong about it
      //
      // ⚠️ the fault is EADDRINUSE — a second bind on a path a first server holds. it is
      //   chosen over an absent-parent-dir fault deliberately: an over-long unix path is
      //   TRUNCATED by libuv rather than refused, so a fixture built on path shape can bind
      //   successfully and leave the clamp unarmed. a doubled bind cannot
      const scene = useBeforeAll(async () => {
        const socketPath = getCloneSocketPath({ serial: getUuid() })!;
        const holder = genCloneSocketServer({
          socketPath,
          write: () => undefined,
          isBrainCliAlive: () => true,
          read: () => ({ live: false, reason: 'feed-not-live' }),
          settle: async () => {},
        });
        await holder.ready;
        const doubled = genCloneSocketServer({
          socketPath,
          write: () => undefined,
          isBrainCliAlive: () => true,
          read: () => ({ live: false, reason: 'feed-not-live' }),
          settle: async () => {},
        });
        return { holder, doubled };
      });
      afterAll(async () => {
        await scene.doubled.close();
        await scene.holder.close();
      });

      when('[t0] its `ready` is awaited', () => {
        // ⚠️ the await is BOUNDED, and the bound is THIS row's assertion. the defect's
        //   signature is a promise that never settles, so an unbounded await reds by jest's
        //   own default timeout — measured at 183s under the mutation, three minutes of
        //   silence with no line that names the cause. bounded, the hang reds HERE, in one
        //   second, with a sentence a reader can act on. a slow, mute red gets disabled
        //
        // ⚠️ the timer is `unref`d so a settled race never holds the event loop open
        const error = useThen(
          'it SETTLES rather than hang',
          async (): Promise<unknown> =>
            Promise.race([
              // resolves to the fault on a reject, to null on a bind that succeeded —
              // so the NEXT row can tell "rejected with X" from "bound after all"
              scene.doubled.ready.then(
                () => null,
                (fault: unknown) => fault,
              ),
              new Promise<never>((_, fail) => {
                const timer = setTimeout(
                  () =>
                    fail(
                      new Error(
                        '`ready` never settled on a bind fault — the fault has no owner, so every caller of this module hangs',
                      ),
                    ),
                  1000,
                );
                timer.unref();
              }),
            ]),
        );

        then('it rejects with the bind fault, structurally readable', () => {
          // ⚠️ read the structured fields, never the prose. node mints these inside its own
          //   `net` module, which under jest shares no realm with the sandbox — so an
          //   `instanceof` read answers false for exactly the errors this asserts about
          expect((error as NodeJS.ErrnoException).syscall).toEqual('listen');
          expect((error as NodeJS.ErrnoException).code).toEqual('EADDRINUSE');
        });

        then('the FIRST server is untouched — its own bind still holds', () => {
          expect(scene.holder.server.listening).toEqual(true);
        });
      });
    },
  );

  given('[case14] a HEALTHY bind, under a bind bound it will outlive', () => {
    // 🚨 the clamp on the bind bound's OWN hazard, which is the only half of it a test can
    //   honestly reach. the bound guards a libuv pathology — a bind that neither succeeds
    //   nor faults — and that condition cannot be provoked hermetically: node emits
    //   `'listening'` on `process.nextTick`, which runs BEFORE the timers phase, so a timer
    //   short enough to win would win by luck rather than by construction. a clamp that
    //   reds by luck is worse than an absent one (`rule.require.clamp-edge-cases`)
    //
    // ⇒ what IS deterministic is the risk the bound introduces: **a healthy bind killed
    //   for impatience**. that is the one hazard the dream named when it deferred this, so
    //   it is the one this row holds. the bound is set to 25ms and the row waits 150ms —
    //   six times past it — so a guard that tears down a settled bind reds here
    //
    // ⚠️ the dogfood, stated with its LIMIT, because a clamp's reach is a fact about the
    //   clamp rather than a claim about the code (`rule.require.clamp-edge-cases`):
    //
    //   | mutation of the guard          | this row |
    //   |--------------------------------|----------|
    //   | it calls `server.close()`      | 🔴 RED in 4s — the real hazard, caught |
    //   | it drops its `readySettled` early-return | 🟢 green, and CORRECTLY so — a `fail` on a settled promise is inert, so there is no defect there to catch. that line is an explicit invariant for a future shape that CAN re-settle, never a clamp-provable one |
    const scene = useBeforeAll(async () => {
      const socketPath = getCloneSocketPath({ serial: getUuid() })!;
      const server = genCloneSocketServer(
        {
          socketPath,
          write: () => undefined,
          isBrainCliAlive: () => true,
          read: () => ({ live: false, reason: 'feed-not-live' }),
          settle: async () => {},
        },
        { bindTimeoutMs: 25 },
      );
      await server.ready;
      await new Promise((done) => setTimeout(done, 150));
      return { server };
    });
    afterAll(async () => scene.server.close());

    when('[t0] the bound has long since elapsed', () => {
      then('the bind still holds — the guard never fired on it', () => {
        expect(scene.server.server.listening).toEqual(true);
      });

      then(
        '`ready` is still resolved, never retroactively rejected',
        async () => {
          // ⚠️ a second await of an ALREADY-settled promise is the assertion: a guard that
          //   rejected late would surface here rather than pass silently
          await expect(scene.server.ready).resolves.toBeUndefined();
        },
      );
    });
  });

  given('[case15] a bind that SUCCEEDS and a lockdown that then faults', () => {
    // 🚨 the clamp on the one fault the bind gate advertised and could not deliver.
    //   `isCloneSocketBindFaultError` allowlists `'chmod'` — the owner-only lockdown — but
    //   that lockdown used to ride `listen(path, cb)`'s callback, which node registers as
    //   one more listen-success listener BEHIND the ready gate's own. so it always ran with
    //   `readySettled` already true, every fault fell to the durable listener's bare-stderr
    //   branch, and the caller's `await ready` had already resolved.
    //
    //   ⚠️ measured 2026-09-05 on the real cli: a `chmod ENOENT` printed one stderr line
    //   and the enroll went on to advertise `🔌 reach this clone` for a server this module
    //   had just `close()`d. that is `rule.forbid.failhide` produced by the guard written
    //   to retire it, and it made the `'chmod'` allowlist entry unreachable by construction.
    //
    // ✅ the fault is REAL, never stubbed, and it uses the mechanism that surfaced it. a
    //   unix address is capped at ~107 bytes of `sun_path`; past that node does NOT report
    //   `ENAMETOOLONG` — it fires its listen-success event, bound at a silently TRUNCATED
    //   address. so the socket file never exists at the untruncated path, and the lockdown's
    //   `chmodSync` on that path faults `ENOENT` with a structured `syscall` — a bind that
    //   succeeded and a lockdown that then failed, which is exactly this row's subject.
    const scene = useBeforeAll(async () => {
      // ⚠️ the PHYSICAL temp path, never the in-repo symlink. the two differ by ~50 bytes
      //   here, and which side of the cap the TRUNCATION lands on is the whole fixture: the
      //   physical base is short enough that the truncated address stays INSIDE this managed
      //   dir, so node's own `close()` reaps it and the row litters no file. the symlink base
      //   would truncate mid-name into a dir that does not exist, which faults at `bind`
      //   instead — a different row's subject
      // ⚠️ a TERSE slug, and that is load-bearing rather than style. the base must fit under
      //   the cap for the truncation to stay inside it, and every slug byte eats that margin
      //   — a 21-byte slug measured 109 bytes here and tripped the guard below
      const base = realpathSync(genTempDir({ slug: 'lock' }));
      const socketPath = `${base}/clone.${getUuid()}.sock`;

      // 🚨 both bounds asserted, never assumed. a host whose temp base is long enough to
      //   push the truncation OUT of it would litter, and one whose full path fits under
      //   the cap would bind cleanly and pass this row green over an unexercised path
      //   (`rule.forbid.faked-or-quarantined-acceptance`)
      if (Buffer.byteLength(base) >= 107)
        throw new ConstraintError(
          '[case15] needs a temp base under the ~107-byte sun_path cap, so the truncated bind stays inside it',
          { base, baseBytes: Buffer.byteLength(base) },
        );
      if (Buffer.byteLength(socketPath) <= 107)
        throw new ConstraintError(
          '[case15] needs a socket path OVER the ~107-byte sun_path cap, so the bind truncates and the lockdown then faults',
          { socketPath, socketBytes: Buffer.byteLength(socketPath) },
        );

      const server = genCloneSocketServer({
        socketPath,
        write: () => undefined,
        isBrainCliAlive: () => true,
        read: () => ({ live: false, reason: 'feed-not-live' }),
        settle: async () => {},
      });
      const error = await getError(server.ready);
      return { server, error };
    });
    // ⚠️ the optional chain is deliberate. the scene throws by design when a host breaks the
    //   cap premise above, and an unguarded teardown would then replace that named
    //   ConstraintError with a bare `cannot read 'close' of undefined` — a cleanup fault
    //   masking the real verdict (`rule.forbid.failhide`)
    afterAll(async () => scene?.server?.close());

    when('[t0] the caller awaits `ready`', () => {
      then('it REJECTS — the fault is never degraded past the caller', () => {
        // 🚨 the whole row. a RESOLVED `ready` here is the defect: the caller would go on
        //   to advertise a reach socket for a server this module has already closed
        //
        // 🚨 `toBeDefined()` is NOT the read, and that is measured rather than cautious:
        //   `getError` resolves to a `NoErrorThrownError` INSTANCE when the promise settles
        //   clean, so a defined-check passes on the very outcome this row exists to catch.
        //   dogfooded 2026-09-05 — under the defect this row stayed green while its three
        //   siblings reddened, i.e. the headline assertion was the one with no teeth.
        expect((scene.error as Error).message).not.toContain(
          'no error was thrown',
        );
      });

      then(
        'the rejection carries the structured syscall a classifier reads',
        () => {
          // ⚠️ read STRUCTURALLY, never via `instanceof` — the same realm trap
          //   `isCloneSocketBindFaultError` documents and this file's own cases measured
          const { syscall, code } = scene.error as NodeJS.ErrnoException;
          expect(syscall).toEqual('chmod');
          expect(code).toEqual('ENOENT');
        },
      );

      then(
        'so the bind-gate classifier OWNS it, never an unclassified throw',
        () => {
          expect(isCloneSocketBindFaultError(scene.error)).toEqual(true);
        },
      );

      then(
        'the server is torn down — no unlocked socket stays reachable',
        () => {
          expect(scene.server.server.listening).toEqual(false);
        },
      );
    });
  });

  given(
    '[case16] a bind that faults, and NO caller ever reads `ready` — the exact case the rejection handler exists for',
    () => {
      // 🚨 raised by the r002 `mech-failhides` lane at i065, after seven rounds dark. the
      //   handler's own docblock carried two clauses that cannot both hold of one
      //   invocation: it exists because "a `ready` that NO caller awaits would raise an
      //   unhandled rejection", and its allowlist was justified because "BOTH are reported
      //   by the caller". with no caller there is no report — so a real, named, anticipated
      //   bind fault was dropped with ZERO trace, while an UNforeseen one left a line. the
      //   guard was loud about the class it understood least (`rule.forbid.failhide`)
      //
      // ⚠️ a socket path under a dir that does not exist. WHICH of the gate's three
      //   syscalls faults is the host's business — measured `chmod`/`ENOTDIR` on linux
      //   2026-09-05 — and this row deliberately pins none of them. what it needs is only
      //   that the fault be CLASSIFIED (an allowlisted syscall), because that is the branch
      //   the allowlist dropped. `[t1]` asserts the classification rather than assumes it,
      //   so a host that faults elsewhere reddens here rather than passes vacuously
      const genPathThatBreaksTheBind = (): string =>
        `${realpathSync(genTempDir({ slug: 'unclaimed' }))}/absent-dir/c.sock`;

      const scene = useBeforeAll(async () => {
        // .note = deliberate mutation — a local capture of the trace lines this module
        //   wrote, appended by the injected sink and read by the assertions; never escapes
        //   this scene
        //
        // 🚨 the sink is INJECTED, never spied. a `jest.spyOn(process.stderr, 'write')` is a
        //   mock in an `.integration.test.ts`, which `rule.forbid.integration.mocks` forbids
        //   outright — and it would also swap a process-wide channel out from under every
        //   other suite that shares the worker. `genCloneSocketServer`'s `options.trace`
        //   exists for exactly this, as a peer of its `options.bindTimeoutMs`
        const wrote: string[] = [];
        const trace = (line: string): void => {
          wrote.push(line);
        };

        // the UNAWAITED half — no handler is ever attached to `ready`
        const unclaimed = genCloneSocketServer(
          {
            socketPath: genPathThatBreaksTheBind(),
            write: () => undefined,
            isBrainCliAlive: () => true,
            read: () => ({ live: false, reason: 'feed-not-live' }),
            settle: async () => {},
          },
          { trace },
        );

        // the AWAITED half, in the SAME scene so both write to one sink — the caller must
        // still receive the fault, and the trace must still be written
        const claimed = genCloneSocketServer(
          {
            socketPath: genPathThatBreaksTheBind(),
            write: () => undefined,
            isBrainCliAlive: () => true,
            read: () => ({ live: false, reason: 'feed-not-live' }),
            settle: async () => {},
          },
          { trace },
        );
        const claimedError = await getError(claimed.ready);

        // `'error'` is async and the `.catch` above lands a microtask later; one macrotask
        // turn is past both
        await new Promise((done) => setTimeout(done, 50));

        return { wrote, claimedError, unclaimed, claimed };
      });
      afterAll(async () => {
        await scene?.unclaimed?.close();
        await scene?.claimed?.close();
      });

      when('[t0] the fault lands with nobody to report it', () => {
        then('it is written to stderr rather than dropped', () => {
          // 🚨 the row the lane's blocker names. under the allowlist this channel was
          //   SILENT for exactly this shape — a CLASSIFIED fault with no caller — so the
          //   count here was 0 while an unclassified fault would have logged
          expect(
            scene.wrote.filter((line) =>
              line.includes('clone socket ready rejected with a bind fault'),
            ),
          ).toHaveLength(2);
        });

        then('the line carries the errno a human must act on', () => {
          // 🚨 SELF-CALIBRATED against the twin's own errno rather than a literal. which
          //   of the gate's three syscalls faults on an absent dir is the host's business,
          //   and a pinned `ENOENT` reddened here on the very run that proved the repair —
          //   the row would have measured the fixture, never the property
          //
          //   ⚠️ the code is asserted NON-EMPTY first, else an `undefined` errno would make
          //   the `toContain` below a check against `''`, which every string satisfies —
          //   a vacuous green over the exact datum this row exists to hold
          const { code } = scene.claimedError as NodeJS.ErrnoException;
          expect(typeof code === 'string' && code.length > 0).toEqual(true);

          const line = scene.wrote.find((each) =>
            each.includes('clone socket ready rejected with a bind fault'),
          );
          expect(line).toContain(code);
        });
      });

      when(
        '[t1] the same fault lands with a caller that DID await `ready`',
        () => {
          then(
            'the caller still receives it — the trace is not a diversion',
            () => {
              // ⚠️ never `toBeDefined()`. `getError` resolves to a `NoErrorThrownError`
              //   INSTANCE on a clean settle, so a defined-check passes on the very outcome
              //   this row exists to catch — measured at `[case15]`, 2026-09-05
              expect((scene.claimedError as Error).message).not.toContain(
                'no error was thrown',
              );
              expect(isCloneSocketBindFaultError(scene.claimedError)).toEqual(
                true,
              );
            },
          );

          then(
            'the trace is CLASSIFIED, never reported as unclassified',
            () => {
              // 🚨 the anti-vacuous half. a handler that dropped the classification and wrote
              //   one blanket sentence would pass [t0] on the count alone, so the WORD is
              //   asserted too — the line must name which of the two branches it took
              expect(
                scene.wrote.filter((line) =>
                  line.includes('an unclassified fault'),
                ),
              ).toHaveLength(0);
            },
          );
        },
      );
    },
  );

  given('[case9] a get read against a LIVE screen', () => {
    // a `❯` box band fenced by two full-width rules, with our sentinel held in the box
    // while a prior turn scrolls above — the `enqueued`-shape grid, so the classifier reports
    // focus input, region dirty, and the needle counted once in-band and once on screen
    const RULE = '─'.repeat(80);
    const GET9_LINES = [
      '❯ Print each integer from 1 to 60',
      '● 1',
      '  2',
      RULE,
      '❯ SENTINEL-get9',
      RULE,
    ];
    const liveScreen: CloneScreenRead = {
      live: true,
      lines: GET9_LINES,
      // every row BRIGHT — the box content is a human's uncommitted work, so `dirty` must be
      // reached on the text itself, never lost to a dim-ghost blank
      linesBright: GET9_LINES,
      cursorX: 0,
      cursorY: 0,
      cols: 80,
      rows: 40,
    };
    const scene = useBeforeAll(async () =>
      genServerWithCapture({ read: () => liveScreen }),
    );
    afterAll(async () => scene.close());

    when('[t0] the input state is read with the sentinel as the needle', () => {
      const reply = useThen('the get reply arrives', async () =>
        getCloneInputState({
          socketPath: scene.socketPath,
          message: 'SENTINEL-get9',
        }),
      );

      then('the probe is capable', () => {
        expect(reply.probe).toEqual('capable');
      });

      then('the classified state matches the rendered grid', () => {
        // the probe is a READ — never a write to the pty, so the capture sink stays empty
        expect(scene.written).toEqual([]);
        if (reply.probe !== 'capable')
          throw new Error('expected a capable reply');
        expect(reply.state).toEqual({
          focus: 'input',
          input: 'dirty',
          countInInput: 1,
          countOnScreen: 1,
          // `false` — this grid carries no queue hint row. asserted rather than omitted because
          // the `toEqual` is the WIRE shape clamp: a `queued` that failed to cross the socket
          // would arrive `undefined`, and prod would then read every busy peer's hold as a take
          queued: false,
        });
      });

      then('a DEFAULT read carries NO box bytes — the opt-in is real', () => {
        // 🔴 the F02/F03 clamp. every routine `say` probe takes this path, so if `content` rode
        //   the reply unasked, the socket would hand a human's uncommitted work across the wire
        //   on every dispatch. the field must be ABSENT here, and `[t1]` proves it is reachable —
        //   the pair is what parts a real opt-in from a flag the server ignores
        if (reply.probe !== 'capable')
          throw new Error('expected a capable reply');
        expect(reply.content).toEqual(undefined);
      });
    });

    when('[t1] the same read OPTS IN to the content', () => {
      const reply = useThen('the get reply arrives', async () =>
        getCloneInputState({
          socketPath: scene.socketPath,
          message: 'SENTINEL-get9',
          content: true,
        }),
      );

      then('the two INPUT surfaces cross the wire', () => {
        if (reply.probe !== 'capable')
          throw new Error('expected a capable reply');
        // the box holds our sentinel, chrome stripped. the queue is `[]` because `queued` is
        // false on this grid — a gate, never an emptiness: the rows above the band hold a queued
        // message and a released turn alike, so an ungated read would report the prior turn
        expect(reply.content).toEqual({
          buffer: ['SENTINEL-get9'],
          queue: [],
        });
      });

      then('the turn output ABOVE the band never crosses', () => {
        if (reply.probe !== 'capable')
          throw new Error('expected a capable reply');
        // 🔴 the scope clamp. the grid renders a prior turn (`Print each integer…`, `● 1`, `  2`)
        //   above the band, and `--what buffer` promises the INPUT surfaces alone. a read that
        //   reached to the whole viewport would ship the brain's rendered session, which is the
        //   exact widened read F03's amendment was bounded against
        const crossed = JSON.stringify(reply.content ?? {});
        expect(crossed).not.toContain('Print each integer');
        expect(crossed).not.toContain('● 1');
      });

      then('a content read is still a READ — no bytes reached the pty', () => {
        expect(scene.written).toEqual([]);
      });
    });
  });

  given('[case18] a screen read that THROWS inside the frame handler', () => {
    // 🔴 the clamp on the accept path's last silent exit. `processChunk` calls `input.read()`,
    //   so an emulator that throws lands in the handler's `.catch` — and that catch used to be
    //   `() => socket.destroy()`: no ack, no trace, connection gone. the client then saw a peer
    //   that accepted its bytes and never answered, and fell to its 30s wedge timer with
    //   `acksSeen: []` — the exact measured signature (2026-09-19), reported two hops from cause.
    // .why THIS injection = `read` is the one `processChunk` dependency a scene can make throw
    //   without a mock, and it is also the REAL prod risk: the emulator is third-party
    //   (`@xterm/headless`) and its `write`/buffer walk can throw (Q25, unsettled).
    const scene = useBeforeAll(async () =>
      genServerWithCapture({
        read: () => {
          throw new Error('the emulator buffer walk faulted');
        },
      }),
    );
    afterAll(async () => scene.close());

    when('[t0] a get probe is read against that server', () => {
      const outcome = useThen(
        'the probe returns rather than hangs',
        async () => {
          const error = await getError(
            getCloneInputState({
              socketPath: scene.socketPath,
              message: 'never-read',
            }),
          );
          // reported as PRIMITIVES — `useThen` hands back a lazy proxy, and a proxy over an
          // array answers neither a deep equality nor `.length`
          return {
            threw: error !== undefined,
            tracedTheThrow: scene.traced.some((line) =>
              line.includes('frame handler threw'),
            ),
            tracedTheCause: scene.traced.some((line) =>
              line.includes('the emulator buffer walk faulted'),
            ),
            wroteToThePty: scene.written.length,
          };
        },
      );

      then(
        'the caller gets an ANSWER rather than a 30s silence — the fault NACKs',
        () => {
          // the whole point: the connection ends with a reply the client can read, so the
          // client's own reach timer never fires. it still throws (the probe failed), and the
          // difference is that it throws AT ONCE with a named reason
          expect(outcome.threw).toEqual(true);
        },
      );

      then(
        'the daemon NAMES the throw on its own trace — the cause, not just the class',
        () => {
          // 🔴 the `server-fault` slug tells the caller the CLASS; only this line carries the
          //   CAUSE, and a class with no cause is what cost four rounds of diagnosis here.
          //   asserted as one object so a failure names which half is absent
          expect({
            tracedTheThrow: outcome.tracedTheThrow,
            tracedTheCause: outcome.tracedTheCause,
          }).toEqual({ tracedTheThrow: true, tracedTheCause: true });
        },
      );

      then(
        'a probe that faulted wrote NO bytes to the pty — a get is a read',
        () => {
          expect(outcome.wroteToThePty).toEqual(0);
        },
      );
    });
  });

  given('[case10] a get read against a NOT-LIVE screen', () => {
    // the default read reports `feed-not-live` — the honest degrade before the feed
    // attaches, so the probe returns `unsupported` rather than a FALSE classification (V7)
    const scene = useBeforeAll(async () => genServerWithCapture());
    afterAll(async () => scene.close());

    when('[t0] the input state is read', () => {
      const reply = useThen('the get reply arrives', async () =>
        getCloneInputState({
          socketPath: scene.socketPath,
          message: 'never-on-screen',
        }),
      );

      then('the probe is unsupported for a feed that is not live', () => {
        expect(reply.probe).toEqual('unsupported');
        if (reply.probe !== 'unsupported')
          throw new Error('expected an unsupported reply');
        expect(reply.reason).toEqual('feed-not-live');
      });

      then('no bytes were written to the pty — a get is a read', () => {
        expect(scene.written).toEqual([]);
      });
    });
  });

  given(
    '[case17] the dequeue pre-check gates the write on the live screen',
    () => {
      // the withheld determination happens SERVER-SIDE at dequeue — the read is current at the
      // write, where a client probe taken before enqueue may be stale by up to 128 dispatches.
      // a dirty region or a modal refuses; `--force` overrides ONLY a dirty region, never a
      // modal, so a say never answers a permission prompt (V3, case=6)
      const RULE = '─'.repeat(80);

      // a live screen whose input box holds a human's uncommitted text — focus input, dirty.
      // BRIGHT, which is what makes it a human's work rather than a brain-drawn ghost: the
      // same rows rendered dim would read `clear`, and rightly so
      const DIRTY_LINES = [RULE, '❯ half a sentence a human left', RULE];
      const dirtyScreen: CloneScreenRead = {
        live: true,
        lines: DIRTY_LINES,
        linesBright: DIRTY_LINES,
        cursorX: 0,
        cursorY: 0,
        cols: 80,
        rows: 24,
      };

      // a live screen whose focus sits on a permission modal — an option menu with a confirm
      const MODAL_LINES = [
        'Do you want to proceed?',
        '❯ 1. Yes',
        '  2. No',
        RULE,
        RULE,
      ];
      const modalScreen: CloneScreenRead = {
        live: true,
        lines: MODAL_LINES,
        linesBright: MODAL_LINES,
        cursorX: 0,
        cursorY: 0,
        cols: 80,
        rows: 24,
      };

      when('[t0] a say lands in a dirty region, no --force', () => {
        const scene = useBeforeAll(async () =>
          genServerWithCapture({ read: () => dirtyScreen }),
        );
        afterAll(async () => scene.close());
        const result = useThen(
          'sayClone resolves a verdict rather than throws',
          async () =>
            sayClone({
              socketPath: scene.socketPath,
              message: 'a dispatched nudge',
            }),
        );

        then('it is withheld for a dirty input region', () => {
          expect(result.delivered).toEqual(false);
          if (result.delivered) throw new Error('expected a withheld verdict');
          expect(result.refusal).toEqual('input-region-dirty');
        });

        then('not one byte reached the pty — refused at dequeue', () => {
          expect(scene.written).toEqual([]);
        });
      });

      when('[t1] the SAME dirty region, dispatched WITH --force', () => {
        const scene = useBeforeAll(async () =>
          genServerWithCapture({ read: () => dirtyScreen }),
        );
        afterAll(async () => scene.close());
        const result = useThen('sayClone resolves', async () =>
          sayClone({
            socketPath: scene.socketPath,
            message: 'a forced nudge',
            force: true,
          }),
        );

        then(
          '--force overrides the dirty region — the message is delivered',
          () => {
            expect(result.delivered).toEqual(true);
          },
        );

        then('the message then its submit `\\r` reached the pty', () => {
          expect(scene.written.join('')).toEqual('a forced nudge\r');
        });
      });

      when('[t2] a modal holds focus, dispatched WITH --force', () => {
        const scene = useBeforeAll(async () =>
          genServerWithCapture({ read: () => modalScreen }),
        );
        afterAll(async () => scene.close());
        const result = useThen('sayClone resolves', async () =>
          sayClone({
            socketPath: scene.socketPath,
            message: 'answer the prompt',
            force: true,
          }),
        );

        then(
          'a modal is withheld EVEN under --force (never answer a prompt, V3)',
          () => {
            expect(result.delivered).toEqual(false);
            if (result.delivered)
              throw new Error('expected a withheld verdict');
            expect(result.refusal).toEqual('modal-holds-focus');
          },
        );

        then('not one byte reached the pty', () => {
          expect(scene.written).toEqual([]);
        });
      });

      when('[t3] the feed FAULTED — the grid is in doubt, WITH --force', () => {
        // a same-version clone whose emulator write/resize threw: the read channel EXISTS
        // but the grid's parse integrity is gone, so a human's just-typed keystrokes may be
        // invisible. the pre-check must withhold (invariant 1, case=2) rather than paste blind
        // — and --force does NOT override it (a faulted grid is not a knowable dirty region).
        // a faulted feed is a SERVER fault (re-enroll), so sayClone throws a MalfunctionError
        const faultedScreen: CloneScreenRead = {
          live: false,
          reason: 'feed-faulted',
        };
        const scene = useBeforeAll(async () =>
          genServerWithCapture({ read: () => faultedScreen }),
        );
        afterAll(async () => scene.close());

        then(
          'the say is withheld as a feed-faulted server fault — not one byte reaches the pty',
          async () => {
            const before = scene.written.length;
            const error = await getError(() =>
              sayClone({
                socketPath: scene.socketPath,
                message: 'a nudge onto a doubted grid',
                force: true,
              }),
            );

            // a faulted feed cannot be classified, so it is a server fault (exit 1), never a
            // caller-amendable withheld — re-enroll, not re-send/force
            expect(error).toBeInstanceOf(MalfunctionError);
            expect((error as Error).message).toContain('feed');

            // invariant 1's teeth: the human's unsubmitted work is never pasted over. revert
            // the feed-faulted branch in genCloneSocketServer and this say proceeds blind →
            // bytes reach the sink → written.length grows → this goes red
            expect(scene.written.length).toEqual(before);
          },
        );
      });
    },
  );

  /**
   * 🚨 .what = the dequeue pre-check AWAITS the emulator's parse drain before it reads the grid
   *
   * .why = the queue makes the gate's read current with the WRITE, which is not the same as
   *   current with the CHILD. the emulator parses async off the child's output, so a read taken
   *   mid-parse sees a STALE grid — it can miss a human's just-typed chars, classify the input
   *   box `clear`, and let the write clobber the mid-type. that is the exact case=2 hazard the
   *   gate exists to prevent, and a gate that reads an un-drained grid does not prevent it
   *
   * ⚠️ .how it has TEETH = the injected pair MODELS the async parse rather than describes it.
   *   the human's keystrokes sit "in the parse pipeline" — invisible to the grid — until the
   *   settle brings them onto it. so the gate's verdict is decided entirely by WHEN it reads:
   *     - it awaits the settle  → it reads DIRTY  → withheld, zero bytes  (this clamp, green)
   *     - it reads first        → it reads CLEAR  → delivered, bytes flow (this clamp, RED)
   *   ⇒ drop the `await input.settle()` in genCloneSocketServer and both `then`s below redden.
   *   verified by mutation 2026-09-18
   */
  given(
    '[case18] a human types mid-dispatch, and the chars are still in the emulator parse',
    () => {
      // ⚠️ the same shapes [case17] uses — an 80-wide rule and the `❯` prompt glyph the
      //   classifier strips. a fake that guessed either (a 40-wide rule, a plain `>`) reads
      //   DIRTY in BOTH states, so the clamp would pass whether or not the gate settles and
      //   prove naught. measured 2026-09-18: the first draft of this scene did exactly that
      const RULE = '─'.repeat(80);
      // the box BEFORE the parse drains — the human's chars have not reached the grid yet, so
      // it renders as an EMPTY box and classifies `clear`
      const PENDING_LINES = [RULE, '❯ ', RULE];
      // the box AFTER it drains — the same box, and the human's uncommitted work is on it
      const DRAINED_LINES = [RULE, '❯ half a thought', RULE];

      const asScreen = (lines: string[]): CloneScreenRead => ({
        live: true,
        lines,
        linesBright: lines,
        cursorX: 0,
        cursorY: 0,
        cols: 80,
        rows: 24,
      });

      when('[t0] a say dequeues against the un-drained grid', () => {
        const scene = useBeforeAll(async () => {
          // .note = deliberate mutation — a one-flag model of the async parse, local to this
          //   scene: the grid does not hold the human's chars until the settle drains them
          let drained = false;
          return {
            ...(await genServerWithCapture({
              read: () => asScreen(drained ? DRAINED_LINES : PENDING_LINES),
              settle: async () => {
                drained = true;
              },
            })),
          };
        });
        afterAll(async () => scene.close());

        const result = useThen('sayClone resolves a verdict', async () =>
          sayClone({
            socketPath: scene.socketPath,
            message: 'a dispatched nudge',
          }),
        );

        then(
          'the gate saw the DRAINED grid — withheld for a dirty input region',
          () => {
            expect(result.delivered).toEqual(false);
            if (result.delivered)
              throw new Error(
                'expected a withheld verdict — the gate read an un-drained grid',
              );
            expect(result.refusal).toEqual('input-region-dirty');
          },
        );

        then(
          "not one byte reached the pty — the human's half-typed line survives",
          () => {
            expect(scene.written).toEqual([]);
          },
        );
      });
    },
  );
});
