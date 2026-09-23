import type { IBufferCell, IBufferLine } from '@xterm/headless';

import { getCloneTraceSink } from '../getCloneTraceSink';
import type { EmulatorModule } from './getEmulatorModuleOrNull';

/**
 * .what = the two emulator buffer shapes the bright-only read dereferences
 * .why = TYPE-only aliases, so the import is erased at compile and no eager `@xterm/headless`
 *   load lands in a bun fast path (`rule.forbid.eager-esm-imports-in-prod`, the same discipline
 *   `EmulatorModule` follows). named locally so the read signature states what it takes
 */
type XtermBufferLine = IBufferLine;
type XtermBufferCell = IBufferCell;

/**
 * .what = the hard ceiling on one `settle` — the longest it waits for the emulator's parse
 *   to drain before it gives up and lets the read proceed
 * .why = a fail-safe, never a tuning knob. the measured drain is ~2ms
 *   (`.agent/.notes/tool.probe-xterm-write-drain.js`), so 250ms is two orders of magnitude
 *   of headroom for a large in-flight chunk — and it exists ONLY so a callback that never
 *   fires cannot wedge the dequeue loop and make the clone permanently deaf
 * .note = declared HERE rather than in `socket/constants.ts`: it has exactly one reader, and
 *   it tunes the SCREEN's parse, where every const there tunes the WIRE
 *   (`rule.prefer.most-common-denominator`)
 */
const SCREEN_SETTLE_TIMEOUT_MS = 250;

/**
 * .what = how many VIEWPORTS deep, from the grid's foot, the per-cell BRIGHT walk runs — every
 *   row above that window takes its full text as its bright text instead
 * .why =
 *   - 🔴 the bright walk is the read's dominant cost and all but a few of its rows are DISCARDED.
 *     `linesBright` has exactly ONE reader — `getInputBand`, which slices the rows between the
 *     LAST full-width `─` rule pair (computeCloneInputState). that band is a viewport-FOOT
 *     structure the tui redraws every frame, so a scrollback row's bright text is computed and
 *     then thrown away
 *   - and the waste GROWS with the session: `asBrightOnlyRow` walks every cell of every row, so
 *     the cost scales with `baseY`, which fills toward the 1000-row scrollback cap as a
 *     conversation runs. ✅ MEASURED 2026-09-18, `.agent/.notes/tool.measure-screen-read-cost.js`,
 *     120x40 at the real prod geometry, the same host and the same probe on each side of the
 *     window (`pollDuty` = share of the 25ms `CLONE_SUBMIT_READY_POLL_MS` one read consumes):
 *     | grid rows | before | pollDuty | after | pollDuty |
 *     |---|---|---|---|---|
 *     | 41 | 0.99ms | 4% | 0.85ms | 3% |
 *     | 201 | 1.61ms | 6% | 1.36ms | 5% |
 *     | 501 | 3.26ms | 13% | 1.53ms | 6% |
 *     | 1001 | 6.24ms | **25%** | **2.38ms** | **10%** |
 *     ⇒ `awaitCloneSubmitReady` polls this read every `CLONE_SUBMIT_READY_POLL_MS` (25ms), so a
 *     LATE turn spent a quarter of the daemon's single event loop on rows nobody reads — measured
 *     on an IDLE host, so a contended one is strictly worse
 *   - ⚠️ the 2.6x at the cap is the honest bound of this cure, and it is NOT a claim that the
 *     residual is free: the `translateToString` per row stays, because `lines` has many readers
 *     and every one of them wants the whole grid. what the window removes is the per-CELL walk on
 *     rows whose bright text no reader dereferences
 *   - ⚠️ and it is NOT a proof that this cost was the cause of a 30s wedge. it proves a real,
 *     avoidable, session-length-scaled cost on the daemon's single event loop
 *     (`rule.forbid.mechanism-inferred-from-outcome` — a bound honored is not a fix demonstrated)
 * .note = the window is TWO viewports, never one: one would sit exactly at the band's own rows,
 *   and a screen mid-scroll would put the band one row above it. a full viewport of slack makes
 *   the fallback unreachable for a live tui rather than merely improbable
 *   (`rule.prefer.prevent-over-correct`, rung 1)
 * .note = 🔴 the fallback for an out-of-window row is its FULL text, never `''`. the bright read
 *   decides `dirty` vs `clear`, and `clear` is what ADMITS a write — so an empty bright row would
 *   read as "no human work here" and let a say clobber a human's text (the case=2 hazard). the
 *   full text reads as "every cell is human work" ⇒ `dirty` ⇒ refuse. the degrade direction is
 *   the safe one by construction, which is why the window needs no trust
 */
const SCREEN_BRIGHT_WINDOW_VIEWPORTS = 2;

/**
 * .what = a live rendered screen — the grid the emulator holds right now
 * .why = the daemon feeds the child's pty STREAM into an emulator; a read of the
 *   emulator's buffer is the rendered SCREEN, the only surface that answers "what SITS
 *   at row R" rather than "what bytes were emitted" (define.pty-stream-vs-screen)
 */
export interface CloneScreenLive {
  live: true;
  /** the rendered grid rows, top to bottom — scrollback then the live viewport */
  lines: string[];
  /**
   * .what = the same rows, rendered with every DIM cell blanked — the BRIGHT-only screen
   * .why =
   *   - a brain-cli draws its own suggestions INSIDE the input box in dim (`CSI 2 m`): the
   *     `Try "…"` placeholder, and a contextual next-turn hint predicted from the last reply.
   *     `translateToString` drops every SGR attribute, so the classifier read those ghosts as
   *     a human's uncommitted text, called the box `dirty`, and refused every `say` with
   *     `input-region-dirty` — permanently, with no non-destructive recovery, because a ghost
   *     never clears on its own (measured 2026-09-17 against a live claude v2.1.87: a peer
   *     went deaf on `❯ now reply with exactly: …`, its own suggested next turn)
   *   - DIM is exactly the signal that parts the two: the brain dims what IT drew and leaves
   *     what the HUMAN typed at default intensity. so a band with no bright content holds no
   *     human work, whatever text it renders
   *   - a parallel BRIGHT-ONLY STRING (rather than a per-row boolean) keeps the classifier's
   *     extant logic verbatim — strip the `❯` glyph, trim, join — because a dim `❯` blanks too,
   *     where a per-row `allDim` flag would be falsified by one bright glyph on a clear box
   * .note = `lines` stays the full grid and is what every COUNT reads: a caller's own
   *   dispatched message may render dim while queued, and a count that lost it would misreport
   *   `absent` for a message that landed. only the dirty/clear decision reads this
   */
  linesBright: string[];
  /** the cursor column, 0-based */
  cursorX: number;
  /** the cursor row within the viewport, 0-based */
  cursorY: number;
  /** the emulator geometry the rows were rendered at */
  cols: number;
  rows: number;
}

/**
 * .what = the honest read when no live screen can be handed back — split by CAUSE
 * .why = a brand-new or unattached feed has an all-blank grid indistinguishable from a
 *   cleared screen. a `feed-not-live` read rather than an empty grid keeps a probe
 *   from a FALSE `absent`, and drives the `unreadable` verdict instead (V7)
 * .note = the two causes carry DIFFERENT remedies, so they are DISTINCT slugs:
 *   - `feed-not-live` — the feed has not yet received a chunk; the remedy is to WAIT
 *     a moment and retry (the first output is imminent)
 *   - `feed-faulted` — a write/resize threw, so the grid's parse integrity is in doubt;
 *     a wait never clears it — only a RE-ENROLL rebuilds the emulator. a shared slug
 *     told a caller to wait forever against a faulted feed (rule.forbid.failhide)
 */
export interface CloneScreenUnfed {
  live: false;
  reason: 'feed-not-live' | 'feed-faulted';
}

export type CloneScreenRead = CloneScreenLive | CloneScreenUnfed;

/**
 * .what = the screen feed — an emulator fed off a clone's pty output, plus a reader
 * .why =
 *   - the daemon tees the child's `onData` into `feed`, so the emulator tracks the same
 *     rendered screen the human sees; `read` reads that grid on demand for a probe
 *   - `feed` is FAULT-ISOLATED: it sits AHEAD of the human's mirror on node-pty's
 *     emitter, which dispatches with no `try`, so a throw here would suppress the human's
 *     own output. it retains the fault (reportable) and never rethrows into the emitter (V16)
 *   - `resize` re-flows the grid on a host resize, so the emulator geometry tracks the
 *     pty geometry and a wrapped row never lands on the wrong line (V14)
 */
export interface CloneScreenFeed {
  /** feed one chunk of the child's output into the emulator (fault-isolated) */
  feed: (data: string) => void;
  /** re-flow the grid to a new geometry (on a host resize) */
  resize: (input: { cols: number; rows: number }) => void;
  /** read the currently-rendered screen, or `feed-not-live` before the first chunk */
  read: () => CloneScreenRead;
  /**
   * .what = await the emulator's in-flight parse, so a FOLLOWING `read` reflects every
   *   byte fed so far
   * .why = `Terminal.write` parses ASYNC, so a bare `read` is point-in-time and the point
   *   may PRECEDE a human's latest keystrokes still in the parse pipeline. the dequeue gate
   *   reads this grid to decide whether the input box is `clear`, so a stale read can miss
   *   a mid-type, call the box clear, and let the write clobber it — the exact case=2 hazard
   *   the gate exists to prevent
   * .note = BOUNDED, always — see the implementation. a settle can never wedge its caller,
   *   whatever the emulator does with its callback
   */
  settle: () => Promise<void>;
  /**
   * the last fault a `feed` / `resize` write raised — retained for a programmatic read AND
   * traced to the operator's stderr the instant it throws, so a `feed-faulted` degrade names
   * its cause rather than hide it (never rethrown into the emitter)
   */
  lastFault: () => Error | null;
  /** dispose the emulator */
  dispose: () => void;
}

/**
 * .what = one rendered row with every DIM cell blanked — the row's BRIGHT-only text
 * .why = the one signal that parts a brain-drawn ghost from a human's typed work. the brain
 *   dims what IT suggested (`CSI 2 m`) and leaves what the human typed at default intensity,
 *   so a blank of the dim cells leaves exactly the human's content behind. a blank (rather
 *   than a drop) keeps every column where it was, so the `❯` strip and the trim the classifier
 *   already applies behave identically on both renderings
 * .note = a width-0 cell is the continuation half of a wide glyph and carries no chars of its
 *   own, so it is skipped; a blank cell renders as one space, to match `translateToString`.
 *   the tail blank is trimmed so an all-dim row reads as empty
 * .note = EXPORTED so the real-brain screen dogfood reads the dim signal through THIS mechanism
 *   (`rule.always.reuse-pavement-before-improvise`)
 * .note = `cursorX` names the cursor-painted cell on this row, and that cell is blanked on its
 *   POSITION, never on its intensity. a tui paints a legible block cursor by re-emission of the
 *   character under it at default intensity, so one cell of an otherwise-dim row comes back bright
 *   and its intensity states naught about who authored the text (measured 2026-09-18). the emulator
 *   does not composite the cursor — @xterm/headless is a parser with no renderer
 *   (genCloneScreenFeed.test.ts case=2c) — so those bytes are the brain's
 * .note = the position blank costs one case: a human who typed exactly ONE character and then
 *   moved the cursor back onto it reads as `clear`. a human at rest leaves the cursor AFTER their
 *   text, so every typed cell holds
 * .note = `cursorX` is `number | null` and REQUIRED — never an `options?` default. a caller with
 *   no cursor on this row says so (`rule.forbid.undefined-inputs`), so the read site is always named
 */
export const asBrightOnlyRow = (input: {
  line: XtermBufferLine;
  scratch: XtermBufferCell;
  cursorX: number | null;
}): string => {
  // .note = deliberate mutation — a bounded per-row accumulator, local to this render
  let bright = '';
  for (let x = 0; x < input.line.length; x++) {
    const cell = input.line.getCell(x, input.scratch);
    if (!cell) continue;
    if (cell.getWidth() === 0) continue;
    const chars = cell.getChars() || ' ';
    // the cursor-painted cell is blanked on its POSITION, never on its intensity — see above
    const isCursorCell = input.cursorX === x;
    bright += cell.isDim() || isCursorCell ? ' '.repeat(chars.length) : chars;
  }
  return bright.trimEnd();
};

/**
 * .what = construct a screen feed backed by an @xterm/headless terminal
 * .why = the one mechanism the read channel rests on — emulate the pty stream into a
 *   grid the socket's `get` can classify. the emulator is INJECTED (a projected type,
 *   lazy-loaded by the caller) so no eager import lands in a bun fast path (V19)
 * .note = `@xterm/headless` parses `write` ASYNC, so a `read` reads whatever the
 *   emulator has parsed so far — a bounded probe poll absorbs the parse lag (measured
 *   ~28ms). `.buffer` is a PROPOSED api, so `allowProposedApi: true` is required
 * .note = `traceToStderr` is the fault sink — real stderr in prod (the default), a capture
 *   in a clamp — INJECTED so a test proves the feed-faulted trace fires without a spy on the
 *   process (the same injected-sink shape genCloneSocketServer uses, r011-i007-n4)
 */
export const genCloneScreenFeed = (
  input: { cols: number; rows: number },
  context: {
    emulator: EmulatorModule;
    traceToStderr?: (line: string) => void;
  },
): CloneScreenFeed => {
  const term = new context.emulator.Terminal({
    cols: input.cols,
    rows: input.rows,
    scrollback: 1000,
    allowProposedApi: true,
  });

  // .note = deliberate mutation — a feed is stateful by nature: `fed` latches once the
  //   first chunk arrives (so a read before any output is `feed-not-live`, not empty),
  //   and `fault` retains the last write fault for observability. both bounded to this
  //   closure, read only through the returned methods
  let fed = false;
  let fault: Error | null = null;

  // the diagnostic trace sink — the daemon's own stderr (the operator channel, never the
  // human's pty mirror), the same sink genCloneSocketServer's own fault traces use. injected
  // so a clamp captures it in place of the real stderr
  const traceToStderr = context.traceToStderr ?? getCloneTraceSink();

  // retain the last write/resize fault AND trace it once to the operator's stderr. a
  // feed-faulted degrade is otherwise SILENT — the only symptom is a `feed-faulted` read on
  // every future probe, with the original exception dark (r011-i007-n4). `lastFault` keeps
  // the programmatic reader; this makes the cause visible the instant it throws. never
  // rethrown — V16 keeps the throw out of node-pty's emitter, this keeps it out of the dark
  const retainFault = (error: unknown): void => {
    fault = error instanceof Error ? error : new Error(String(error));
    traceToStderr(
      `😶 clone screen feed fault — degraded to feed-faulted, re-enroll to clear: ${fault.message}\n`,
    );
  };

  const feed = (data: string): void => {
    // ⚠️ isolate the emulator write from node-pty's emitter — a throw here would reach
    //   the emitter (no `try` there) and suppress the human's mirror downstream (V16).
    //   the fault is RETAINED + traced, never rethrown, never silently dropped
    try {
      term.write(data);
      if (data.length > 0) fed = true;
    } catch (error) {
      retainFault(error);
    }
  };

  const resize = (resizeInput: { cols: number; rows: number }): void => {
    try {
      term.resize(resizeInput.cols, resizeInput.rows);
    } catch (error) {
      retainFault(error);
    }
  };

  const settle = (): Promise<void> =>
    new Promise<void>((finish) => {
      // an EMPTY write is the drain barrier. @xterm/headless queues each write's callback
      // BEHIND every prior chunk, so a `''` write's callback fires only once the backlog has
      // parsed into the grid — which is exactly "the read that follows me is current".
      //
      // ✅ MEASURED 2026-09-18, `.agent/.notes/tool.probe-xterm-write-drain.js`, four edges:
      //   - the callback fires, in ~2ms, and `buffer` already reflects the write by then
      //   - it fires AFTER `write()` returns, so the await is real and never a no-op
      //   - an EMPTY write fires its callback too — both on a fresh terminal and against an
      //     already-idle parser. this is the one edge the barrier rests on, and it holds
      //   - two queued writes drain in the order they were issued
      //
      // ⚠️ BOUNDED, unconditionally. the hazard an unbounded await carries is not a slow
      //   read — it is a PERMANENTLY DEAF clone: this settle runs inside the dequeue loop, so
      //   a callback that never fires would wedge that loop and refuse every future `say`,
      //   forever. that is strictly worse than the narrow stale-grid clobber it closes. the
      //   timer makes the wedge IMPOSSIBLE rather than merely improbable, so the seam is safe
      //   even if a future emulator version coalesces or drops a callback
      //   (`rule.prefer.prevent-over-correct`, rung 1)
      //
      // .note = the bound ELAPSING is not a fault — the grid is then merely as current as an
      //   unsettled read would have been, which is the extant behavior. so it degrades to the
      //   status quo rather than to an error, and never poisons the feed with a false
      //   `feed-faulted` (`rule.forbid.failhide` cuts the other way here: a fault slug would
      //   tell a caller to re-enroll over a 50ms stall)
      // .note = deliberate mutation — a one-shot latch local to this settle, so neither the
      //   callback nor the timer can finish a promise the other already finished
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        finish();
      }, SCREEN_SETTLE_TIMEOUT_MS);
      const finishOnce = (): void => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        finish();
      };

      // the write is fault-isolated exactly as `feed` is — a disposed term raises here, and a
      // throw must not escape into the dequeue loop's await
      try {
        term.write('', finishOnce);
      } catch (error) {
        retainFault(error);
        finishOnce();
      }
    });

  const read = (): CloneScreenRead => {
    // a retained write/resize fault leaves the grid's parse integrity in doubt — the
    // emulator may hold a STALE or partial view. degrade to `feed-faulted` (a DISTINCT
    // cause from an unfed feed) so a probe reads `unreadable` (loud) rather than a
    // confident verdict off a poisoned grid, AND so the report names the right remedy:
    // a faulted feed clears only on re-enroll, never on a wait. the fault surfaces HERE,
    // at the read surface that decides outcomes — never retained but unread. V16 keeps a
    // throw out of the emitter; this keeps a fault out of a false verdict
    if (fault !== null) return { live: false, reason: 'feed-faulted' };

    // an unfed feed has a blank grid indistinguishable from a cleared screen — hand back
    // an honest `feed-not-live` rather than an empty screen a probe would read as `absent` (V7)
    if (!fed) return { live: false, reason: 'feed-not-live' };

    // ⚠️ the buffer READ is fault-isolated too, not only the `feed`/`resize` writes.
    //   `term.buffer.active`, `getLine`, and `translateToString` are proposed-api derefs that
    //   can throw — a disposed term on the finalize path, an emulator defect, a proposed-api
    //   hiccup. this read runs SYNCHRONOUSLY inside the socket's `data` handler (both the
    //   dequeue pre-check and the probe route call it), so an uncaught throw here escapes as an
    //   uncaughtException and kills the whole daemon — the exact unowned-fault shape V16 exists
    //   to prevent, one surface over. so a read fault is RETAINED + traced (as a write fault is)
    //   and degrades to `feed-faulted`, never crashes the process (r006-i010-n1)
    try {
      const buffer = term.buffer.active;
      // read scrollback + the live viewport: [0, baseY + rows) covers all the brain drew
      const lastRow = buffer.baseY + term.rows;
      // .note = deliberate mutation — two bounded row collectors, local to this read
      const lines: string[] = [];
      const linesBright: string[] = [];
      // one reusable cell object, per the emulator's own perf guidance — a per-cell allocation
      // over a 40x120 grid plus scrollback would churn on every probe
      const scratch = buffer.getNullCell();
      // the cursor's ABSOLUTE row — `cursorY` is viewport-relative, so `baseY` lifts it into
      // the same index space this loop walks (scrollback first, then the live viewport). the
      // bright read blanks the cursor-painted cell on exactly that one row (asBrightOnlyRow)
      const cursorRow = buffer.baseY + buffer.cursorY;
      // the first row the per-cell BRIGHT walk runs on — every row above it takes its own full
      // text as its bright text, which is the STRICT read (see SCREEN_BRIGHT_WINDOW_VIEWPORTS)
      const brightFrom = Math.max(
        0,
        lastRow - SCREEN_BRIGHT_WINDOW_VIEWPORTS * term.rows,
      );
      for (let y = 0; y < lastRow; y++) {
        const line = buffer.getLine(y);
        const text = line?.translateToString(true) ?? '';
        lines.push(text);
        linesBright.push(
          line && y >= brightFrom
            ? asBrightOnlyRow({
                line,
                scratch,
                cursorX: y === cursorRow ? buffer.cursorX : null,
              })
            : text,
        );
      }

      return {
        live: true,
        lines,
        linesBright,
        cursorX: buffer.cursorX,
        cursorY: buffer.cursorY,
        cols: term.cols,
        rows: term.rows,
      };
    } catch (error) {
      retainFault(error);
      return { live: false, reason: 'feed-faulted' };
    }
  };

  return {
    feed,
    resize,
    read,
    settle,
    lastFault: () => fault,
    dispose: () => term.dispose(),
  };
};
