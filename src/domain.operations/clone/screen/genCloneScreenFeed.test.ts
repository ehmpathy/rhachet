import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { type CloneScreenRead, genCloneScreenFeed } from './genCloneScreenFeed';
import { getEmulatorModuleOrNull } from './getEmulatorModuleOrNull';

/**
 * .what = unit tests for the screen feed, backed by the real @xterm/headless
 * .why = @xterm/headless is a pure in-process js dep (no fs, db, or network), so a unit test
 *   injects the real module — the feed's contract is proven against the emulator it ships with,
 *   never a fake. the parse is async, so a read waits a tick after a write (the measured lag)
 */

const emulator = getEmulatorModuleOrNull();
if (emulator === null)
  throw new MalfunctionError(
    '@xterm/headless absent — the screen feed cannot be tested without its required prod dep',
    {
      hint: 'run `pnpm install` to restore @xterm/headless, then re-run this suite',
    },
  );

// the emulator parses `write` async, so a read taken the same tick can miss the content.
// poll the rendered grid until a predicate holds rather than bet a fixed timer drains it —
// a slow parse waits longer, a fast one returns at once, and a bound fails loud (never a
// silent proceed on an un-drained grid, which is the flake a fixed 50ms timer seeds)
const waitUntilRendered = async (
  feed: { read: () => CloneScreenRead },
  holds: (read: CloneScreenRead) => boolean,
): Promise<void> => {
  const boundMs = 2000;
  const stepMs = 5;
  const startedAt = Date.now();
  // .note = deliberate mutation — a bounded poll loop, local to this wait
  while (Date.now() - startedAt < boundMs) {
    if (holds(feed.read())) return;
    await new Promise((wake) => setTimeout(wake, stepMs));
  }
  throw new MalfunctionError(
    'screen feed did not render the awaited state within 2000ms — the async parse never drained',
    {
      hint: 'the emulator parse is slower than the bound, or the predicate never holds',
    },
  );
};

describe('genCloneScreenFeed', () => {
  given('[case1] a fresh feed, before any chunk', () => {
    const scene = useBeforeAll(async () =>
      genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator }),
    );
    afterAll(() => scene.dispose());

    when('[t0] read is called', () => {
      then('it reports feed-not-live, never an empty screen (V7)', () => {
        const read = scene.read();
        expect(read.live).toBe(false);
        if (read.live === false) expect(read.reason).toBe('feed-not-live');
      });

      then('lastFault is null', () => {
        expect(scene.lastFault()).toBeNull();
      });
    });
  });

  given('[case2] a feed fed one line of output', () => {
    const scene = useBeforeAll(async () => {
      const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
      feed.feed('hello screen');
      await waitUntilRendered(
        feed,
        (read) =>
          read.live === true &&
          read.lines.some((line) => line.includes('hello screen')),
      );
      return feed;
    });
    afterAll(() => scene.dispose());

    when('[t0] read is called', () => {
      then('it reports a live screen with the rendered row', () => {
        const read = scene.read();
        expect(read.live).toBe(true);
        if (read.live === true) {
          expect(read.lines.some((line) => line.includes('hello screen'))).toBe(
            true,
          );
          expect(read.cols).toBe(80);
          expect(read.rows).toBe(24);
        }
      });
    });
  });

  given(
    '[case2b] a feed fed a DIM row beside a BRIGHT one — the real SGR stream',
    () => {
      // 🔴 the mechanism clamp for the color-blind-classifier cure, against the REAL emulator.
      // the classifier keys its dirty/clear decision on `linesBright`, on the claim that a DIM
      // cell is brain-drawn chrome and a default-intensity cell is a human's typed work. that
      // claim rests on this read, so it is pinned HERE rather than only through the classifier's
      // hand-built fixtures — a fixture cannot prove @xterm/headless reports `isDim()` at all.
      //
      // `CSI 2 m` is the dim attribute a brain-cli writes around its own suggestion text; `CSI
      // 0 m` resets it. so the stream below is exactly the shape a live screen carries when the
      // brain greys a hint into the input box above a line the human typed
      const scene = useBeforeAll(async () => {
        const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
        feed.feed('\x1b[2mGHOST-dim-row\x1b[0m\r\nHUMAN-bright-row\r\n');
        await waitUntilRendered(
          feed,
          (read) =>
            read.live === true &&
            read.lines.some((line) => line.includes('HUMAN-bright-row')),
        );
        return feed;
      });
      afterAll(() => scene.dispose());

      when('[t0] read is called', () => {
        then(
          'the FULL grid carries both rows — the dim text is still rendered text',
          () => {
            // the premise the next clamp rests on: a dim row is NOT absent from the screen.
            // that is precisely why `translateToString` alone made the classifier color-blind
            const read = scene.read();
            expect(read.live).toBe(true);
            if (read.live !== true) throw new Error('expected a live read');
            expect(
              read.lines.some((line) => line.includes('GHOST-dim-row')),
            ).toBe(true);
            expect(
              read.lines.some((line) => line.includes('HUMAN-bright-row')),
            ).toBe(true);
          },
        );

        then(
          'the BRIGHT-only grid drops the dim row and keeps the bright one',
          () => {
            // the cure, measured: the dim row blanks to empty, the bright row survives verbatim.
            // goes RED under the pre-cure feed, which had no `linesBright` at all
            const read = scene.read();
            expect(read.live).toBe(true);
            if (read.live !== true) throw new Error('expected a live read');
            expect(
              read.linesBright.some((line) => line.includes('GHOST-dim-row')),
            ).toBe(false);
            expect(
              read.linesBright.some((line) =>
                line.includes('HUMAN-bright-row'),
              ),
            ).toBe(true);
          },
        );

        then(
          'both grids hold the same row count — a blank row, never a dropped one',
          () => {
            // the classifier slices the SAME index window out of both grids to read the input
            // band (it locates the rule rows on `lines`), so a dropped row would misalign the
            // window and read the wrong band — the clobber and modal defects, reintroduced
            const read = scene.read();
            expect(read.live).toBe(true);
            if (read.live !== true) throw new Error('expected a live read');
            expect(read.linesBright.length).toEqual(read.lines.length);
          },
        );
      });
    },
  );

  given('[case2c] a DIM row with the CURSOR parked on one of its cells', () => {
    // 🔴 the measurement that parts two rival causes of a live defect, 2026-09-18. a peer's
    // box rendered `❯ show me the diff for src/…/sayClone.ts` — the brain's own suggestion —
    // and the BRIGHT-only read of that row came back `❯ s`, not empty. one cell survived, at
    // column 2, and the cursor sat at exactly `(x:2,y:18)`. so `contentBright` was `'s'`,
    // length 1, and the box read `dirty`: the dim cure defeated by a single cell.
    //
    // two causes produce that, and only a measurement parts them:
    //   (H1) @xterm/headless composites the cursor into the cell, so the cell under it
    //        reports non-dim whatever the stream said
    //   (H2) the emulator reports the stream faithfully, and the BRAIN writes that one cell
    //        bright itself — the usual way a tui paints a readable block cursor over dim text
    //
    // this clamp feeds a wholly-dim row and parks the cursor inside it, so the only variable
    // left is the emulator. an empty bright row proves H2; a non-empty one proves H1
    const scene = useBeforeAll(async () => {
      const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
      // the dim row, then `CSI 1;3 H` — cursor to row 1, col 3 (1-based) = (x:2,y:0),
      // which is the third cell of the dim text, never a blank past its end
      feed.feed('\x1b[2mGHOST-dim-row\x1b[0m\x1b[1;3H');
      await waitUntilRendered(
        feed,
        (read) =>
          read.live === true &&
          read.lines.some((line) => line.includes('GHOST-dim-row')) &&
          read.cursorX === 2,
      );
      return feed;
    });
    afterAll(() => scene.dispose());

    when('[t0] the bright-only grid is read', () => {
      then('the cursor sits inside the dim row', () => {
        // the premise the next clamp rests on — a cursor past the row's content would
        // measure a blank cell and prove naught
        const read = scene.read();
        if (read.live !== true) throw new Error('expected a live read');
        expect(read.cursorX).toBe(2);
        expect(read.cursorY).toBe(0);
        expect(read.lines[0]).toContain('GHOST-dim-row');
      });

      then(
        'the dim row STILL blanks whole — the emulator does not composite the cursor',
        () => {
          // H2, measured: @xterm/headless is a parser with no renderer, so it paints no
          // cursor into a cell. the read is faithful to the stream, which means a bright
          // cell inside an otherwise-dim box row came from the BRAIN's own bytes — and that
          // is the shape [case2d] clamps the cure against
          const read = scene.read();
          if (read.live !== true) throw new Error('expected a live read');
          expect(read.linesBright[0]).toBe('');
        },
      );
    });
  });

  given(
    '[case2d] a DIM row whose CURSOR CELL the brain paints bright — the live shape',
    () => {
      // 🔴 the cure clamp for the one-bright-cell defeat, modeled on the 2026-09-18 capture.
      // [case2c] proved the emulator composites no cursor, so the one bright cell came from the
      // BRAIN: a tui paints a legible block cursor by re-emission of the character under it at
      // default intensity. the stream below is that exact shape —
      //   `❯ ` bright chrome · `s` bright (the cursor-painted cell) · the rest dim
      // which renders `❯ show me…` and, under the pre-cure read, `❯ s`. one cell, length 1,
      // and `computeCloneInputState` then reads the box `dirty` and refuses every say
      const GHOST = 'show me the diff';
      const scene = useBeforeAll(async () => {
        const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
        feed.feed(
          // the bright prompt chrome, the bright cursor-painted first char, then the dim rest
          `❯ ${GHOST[0]!}\x1b[2m${GHOST.slice(1)}\x1b[0m` +
            // `CSI 1;3 H` — park the cursor back onto the bright char at (x:2,y:0), which is
            // where a brain leaves it when it offers a suggestion at the box's input start
            '\x1b[1;3H',
        );
        await waitUntilRendered(
          feed,
          (read) =>
            read.live === true &&
            read.lines.some((line) => line.includes(GHOST)) &&
            read.cursorX === 2,
        );
        return feed;
      });
      afterAll(() => scene.dispose());

      when('[t0] the bright-only grid is read', () => {
        then('the FULL grid still carries the whole ghost row', () => {
          // the premise: the counts read `lines`, so a caller's own queued message must never
          // be lost to this blank — only the dirty/clear decision reads the bright grid
          const read = scene.read();
          if (read.live !== true) throw new Error('expected a live read');
          expect(read.lines[0]).toContain(`❯ ${GHOST}`);
          expect(read.cursorX).toBe(2);
        });

        then(
          'the ghost row blanks to the CHROME alone — the cursor cell is gone too',
          () => {
            // goes RED under the pre-cure read, which handed back `❯ s`: the cursor-painted
            // cell reported non-dim, so one character of brain-drawn text passed as human work
            const read = scene.read();
            if (read.live !== true) throw new Error('expected a live read');
            expect(read.linesBright[0]).toBe('❯');
          },
        );

        then(
          'a HUMAN row keeps its text — the blank is one cell, never a whole row',
          async () => {
            // the counter-half. a read that blanked the row (or every bright cell) would satisfy
            // the clamp above and destroy the signal: a human's typed box must STILL read dirty.
            // the cursor sits at the END of typed text, as a human at rest leaves it, so every
            // typed cell holds — the exact case the cure must not break
            const feed = genCloneScreenFeed(
              { cols: 80, rows: 24 },
              { emulator },
            );
            feed.feed('❯ HUMAN-typed-work');
            await waitUntilRendered(
              feed,
              (read) =>
                read.live === true &&
                read.lines.some((line) => line.includes('HUMAN-typed-work')),
            );
            const read = feed.read();
            if (read.live !== true) throw new Error('expected a live read');
            expect(read.linesBright[0]).toContain('HUMAN-typed-work');
            feed.dispose();
          },
        );
      });
    },
  );

  given('[case3] a feed resized to a new geometry', () => {
    const scene = useBeforeAll(async () => {
      const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
      feed.feed('x');
      feed.resize({ cols: 120, rows: 40 });
      await waitUntilRendered(
        feed,
        (read) => read.live === true && read.cols === 120 && read.rows === 40,
      );
      return feed;
    });
    afterAll(() => scene.dispose());

    when('[t0] read is called', () => {
      then('the read reports the new geometry (V14)', () => {
        const read = scene.read();
        expect(read.live).toBe(true);
        if (read.live === true) {
          expect(read.cols).toBe(120);
          expect(read.rows).toBe(40);
        }
      });
    });
  });

  given('[case4] a feed handed a value the emulator write rejects', () => {
    const scene = useBeforeAll(async () => {
      // an emulator that throws on write proves the fault is retained, never rethrown into
      // the emitter (V16)
      const faultEmulator = {
        Terminal: class {
          cols = 80;
          rows = 24;
          write(): void {
            throw new Error('write blew up');
          }
          resize(): void {}
          dispose(): void {}
          get buffer(): never {
            throw new Error('unreached');
          }
        },
      } as unknown as typeof emulator;
      // .note = deliberate mutation — a capture sink in place of real stderr, so the clamp
      //   proves the fault trace fires (r011-i007-n4) without a spy on the process
      const traced: string[] = [];
      const feed = genCloneScreenFeed(
        { cols: 80, rows: 24 },
        { emulator: faultEmulator, traceToStderr: (line) => traced.push(line) },
      );
      return { feed, traced };
    });

    when('[t0] a chunk is fed', () => {
      then('feed does not throw, and the fault is retained (V16)', () => {
        expect(() => scene.feed.feed('boom')).not.toThrow();
        const fault = scene.feed.lastFault();
        expect(fault).toBeInstanceOf(Error);
        expect(fault?.message).toContain('write blew up');
      });

      then('the feed stays unfed, so read reports feed-not-live', () => {
        const read = scene.feed.read();
        expect(read.live).toBe(false);
      });

      then(
        'the fault is TRACED to the operator sink — not dead observability (r011-i007-n4)',
        () => {
          // the clamp: a feed-faulted degrade must name its cause loud, never hide it. this
          // goes RED under the pre-fix code (the fault was retained but never traced)
          const faultTraces = scene.traced.filter((line) =>
            line.includes('feed-faulted'),
          );
          expect(faultTraces.length).toBeGreaterThanOrEqual(1);
          expect(faultTraces[0]).toContain('write blew up');
        },
      );
    });
  });

  given('[case6] a feed whose buffer READ throws (not a write)', () => {
    const scene = useBeforeAll(async () => {
      // a fake that latches live on write, then throws on the `buffer` deref the READ makes —
      // proves read is fault-isolated too, never only feed/resize. this read runs sync
      // inside the socket data handler, so an uncaught throw would kill the daemon (r006-i010-n1)
      const readFaultEmulator = {
        Terminal: class {
          cols = 80;
          rows = 24;
          write(): void {}
          resize(): void {}
          dispose(): void {}
          get buffer(): never {
            throw new Error('buffer read blew up');
          }
        },
      } as unknown as typeof emulator;
      // .note = deliberate mutation — a capture sink in place of real stderr, as case4 uses
      const traced: string[] = [];
      const feed = genCloneScreenFeed(
        { cols: 80, rows: 24 },
        {
          emulator: readFaultEmulator,
          traceToStderr: (line) => traced.push(line),
        },
      );
      feed.feed('now live');
      return { feed, traced };
    });
    afterAll(() => scene.feed.dispose());

    when('[t0] read is called and the buffer deref throws', () => {
      then('read does NOT throw — the daemon survives the read fault', () => {
        // the clamp: goes RED under the pre-fix code (the buffer read was unguarded, so the
        // throw escaped as an uncaughtException out of the socket data handler)
        expect(() => scene.feed.read()).not.toThrow();
      });

      then(
        'it degrades to feed-faulted, and the fault is retained + traced',
        () => {
          const read = scene.feed.read();
          expect(read.live).toBe(false);
          if (read.live === false) expect(read.reason).toBe('feed-faulted');
          const fault = scene.feed.lastFault();
          expect(fault?.message).toContain('buffer read blew up');
          const faultTraces = scene.traced.filter((line) =>
            line.includes('feed-faulted'),
          );
          expect(faultTraces.length).toBeGreaterThanOrEqual(1);
        },
      );
    });
  });

  given('[case5] a feed that goes live, then a LATER fault', () => {
    const scene = useBeforeAll(async () => {
      // a fake that latches live on write, then faults on resize — proves a fault AFTER
      // `fed=true` degrades the read rather than a stale grid a probe would trust (r6.b1)
      // .note = the buffer fake models BOTH reads the feed performs: `translateToString` for the
      //   full grid, and the per-cell walk (`getNullCell` + `getCell`/`getWidth`/`isDim`) for the
      //   bright-only grid. every cell reports bright, so the fake's own row survives the blank —
      //   a fake that modeled only `translateToString` would make the cell walk throw, and the
      //   read's own fault isolation would then degrade it to `feed-faulted` BEFORE the resize,
      //   so the "live before any fault" clamp would go green for the wrong reason
      const ROW_TEXT = 'first line ok';
      const lateFaultEmulator = {
        Terminal: class {
          cols = 80;
          rows = 24;
          write(): void {}
          resize(): void {
            throw new Error('resize blew up');
          }
          dispose(): void {}
          get buffer(): never {
            return {
              active: {
                baseY: 0,
                cursorX: 0,
                cursorY: 0,
                getNullCell: () => ({}),
                getLine: () => ({
                  length: ROW_TEXT.length,
                  translateToString: () => ROW_TEXT,
                  getCell: (x: number) => ({
                    getChars: () => ROW_TEXT[x] ?? '',
                    getWidth: () => 1,
                    isDim: () => 0,
                  }),
                }),
              },
            } as never;
          }
        },
      } as unknown as typeof emulator;
      const feed = genCloneScreenFeed(
        { cols: 80, rows: 24 },
        { emulator: lateFaultEmulator },
      );
      feed.feed('first line ok');
      return feed;
    });
    afterAll(() => scene.dispose());

    when('[t0] the feed is live, then a fault is retained', () => {
      then('a read is live before any fault', () => {
        expect(scene.read().live).toBe(true);
      });

      then(
        'after a retained fault, read degrades to feed-faulted (NOT feed-not-live)',
        () => {
          scene.resize({ cols: 120, rows: 40 });
          const fault = scene.lastFault();
          expect(fault).toBeInstanceOf(Error);
          // the grid's integrity is now in doubt — the read must NOT assert a confident grid.
          // the cause is `feed-faulted`, DISTINCT from an unfed `feed-not-live`: a faulted
          // emulator never self-heals on a wait, so the report names re-enroll (the dream's
          // whole point — a shared slug told a caller to wait forever against a faulted feed)
          const read = scene.read();
          expect(read.live).toBe(false);
          if (read.live === false) expect(read.reason).toBe('feed-faulted');
        },
      );
    });
  });

  /**
   * .what = the DRAIN barrier — `settle` awaits the emulator's in-flight parse, so the read
   *   that follows it reflects every byte fed
   *
   * 🚨 .why this is the clamp that matters = the dequeue gate reads this grid to decide
   *   whether a human's input box is `clear`. the emulator parses ASYNC, so a read taken the
   *   same tick as a chunk can MISS a human's just-typed chars, call the box clear, and let
   *   the write clobber the mid-type — the exact case=2 hazard that gate exists to prevent
   *
   * ⚠️ .note = the un-settled half is asserted with NO poll and NO timer. it reads the grid
   *   on the same tick as the feed, which is precisely the stale read the barrier closes.
   *   every OTHER case in this file reaches for `waitUntilRendered` to absorb that lag —
   *   this one exhibits it
   */
  given('[case7] a feed handed a chunk, then settled', () => {
    when('[t0] the grid is read before and after one settle', () => {
      then(
        'the un-settled read MISSES the chunk, the settled read holds it',
        async () => {
          const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
          try {
            feed.feed('typed by a human');

            // the SAME-TICK read — no await between the feed and this line. the parse has not
            // drained, so the grid does not yet carry the chunk. this is the stale read
            const readUnsettled = feed.read();
            const holdsUnsettled =
              readUnsettled.live === true &&
              readUnsettled.lines.some((line) =>
                line.includes('typed by a human'),
              );
            expect(holdsUnsettled).toBe(false);

            // one settle, then read — the barrier drained the parse, so the grid is current
            await feed.settle();
            const readSettled = feed.read();
            expect(readSettled.live).toBe(true);
            if (readSettled.live === true)
              expect(
                readSettled.lines.some((line) =>
                  line.includes('typed by a human'),
                ),
              ).toBe(true);
          } finally {
            feed.dispose();
          }
        },
      );

      then('the settle raises no fault of its own', async () => {
        const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
        try {
          feed.feed('a line');
          await feed.settle();
          expect(feed.lastFault()).toBeNull();
        } finally {
          feed.dispose();
        }
      });

      then(
        'a settle on a feed that was never fed still finishes — it is not a wait for data',
        async () => {
          const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });
          try {
            await feed.settle();
            // the settle drains a parse; it does not latch `fed`, so an unfed feed stays
            // honestly unfed rather than reports a false empty screen (V7)
            const read = feed.read();
            expect(read.live).toBe(false);
            if (read.live === false) expect(read.reason).toBe('feed-not-live');
          } finally {
            feed.dispose();
          }
        },
      );
    });
  });

  /**
   * 🚨 .what = the HANG bound — a settle against an emulator whose write-callback never fires
   *   still finishes
   *
   * .why = this settle runs inside the dequeue loop, so an unbounded await would not merely
   *   slow a read — it would wedge that loop and make the clone PERMANENTLY DEAF to `say`,
   *   which is strictly worse than the narrow stale-grid clobber the barrier closes. that
   *   hazard is the whole reason the seam was deferred once (fulcrum F10), so the bound is
   *   clamped rather than asserted: a fake that swallows the callback proves the timer, and a
   *   settle with NO timer would hang this test rather than fail it
   *   (`rule.prefer.prevent-over-correct`, rung 1 — the wedge is impossible, not improbable)
   */
  given('[case8] an emulator whose write callback never fires', () => {
    when('[t0] settle is awaited', () => {
      then('it finishes on its own bound, never hangs', async () => {
        const deafEmulator = {
          Terminal: class {
            cols = 80;
            rows = 24;
            // ⚠️ the callback is DROPPED — the exact failure mode an unbounded await would
            //   turn into a permanently deaf clone
            write(): void {}
            resize(): void {}
            dispose(): void {}
            get buffer(): never {
              return {
                active: {
                  baseY: 0,
                  cursorX: 0,
                  cursorY: 0,
                  getNullCell: () => ({}),
                  getLine: () => null,
                },
              } as never;
            }
          },
        } as unknown as typeof emulator;

        const feed = genCloneScreenFeed(
          { cols: 80, rows: 24 },
          { emulator: deafEmulator },
        );
        try {
          const startedAt = Date.now();
          await feed.settle();
          const elapsedMs = Date.now() - startedAt;

          // it waited for the bound rather than returned at once — so the barrier is real
          // and the fallback is what released it
          expect(elapsedMs).toBeGreaterThanOrEqual(200);
          // and it released WELL inside any dispatch budget — never a wedge
          expect(elapsedMs).toBeLessThan(2000);

          // an elapsed bound is NOT a fault: the grid is merely as current as an unsettled
          // read would have been, which is the extant behavior. a `feed-faulted` here would
          // tell a caller to re-enroll over a stall
          expect(feed.lastFault()).toBeNull();
        } finally {
          feed.dispose();
        }
      });
    });
  });
});
