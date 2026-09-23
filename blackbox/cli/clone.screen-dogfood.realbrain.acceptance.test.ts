import { MalfunctionError } from 'helpful-errors';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';
import { genTempDir } from 'test-fns';

import {
  asCloneSayHeadSnapshotSafe,
  enrollRealClaudeAndWaitReach,
  getRealClaudeOrThrow,
  setupEnrollFixture,
  setRealClaudeFirstRunAccepted,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { genCloneHistoryRelink } from '@src/domain.operations/clone/genCloneHistoryRelink';
import { getCloneSubmittedCount } from '@src/domain.operations/clone/getCloneSubmittedCount';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { computeCloneInputState } from '@src/domain.operations/clone/screen/computeCloneInputState';
import {
  asBrightOnlyRow,
  type CloneScreenLive,
} from '@src/domain.operations/clone/screen/genCloneScreenFeed';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

/**
 * .what = the screen dogfood — feed a LIVE claude's raw pty stream through the
 *   @xterm/headless emulator and measure how each input state RENDERS, so the
 *   `read` build (todo 4) and `clone get` classification (todo 5) are built
 *   against measured rows instead of guessed ones.
 * .why =
 *   - the pty gives a byte STREAM, not a rendered SCREEN (define.pty-stream-vs-screen).
 *     the whole read-channel design rests on emulation of that stream into a grid, then
 *     a read of its REGIONS. this test proves the grid carries what the design needs.
 *   - it answers the vision's screen research questions against a real brain:
 *       Q6  a queued message renders on screen        (locate the queue region)
 *       Q7  the input region is locatable             (locate the input box)
 *       Q10 a multi-row message occupies several rows  (the paste-wrapped height)
 *       Q11 render latency — the screen carries our text within the poll floor
 *   - it emits the rendered grids to a research artifact so the build reads MEASURED
 *     structure, per rule.require.playtest-via-real-dogfood.
 *
 * .note = a real-brain tier: credential-gated, costly, gates LOUD (never skips) via
 *   getRealClaudeOrThrow, per rule.forbid.faked-or-quarantined-acceptance.
 */

// a cold claude boot plus several dispatches runs minutes on a small ci runner — the
// same 5-minute bound the peer real-brain clamps carry
jest.setTimeout(300000);

// the outer pty geometry the harness spawns rhachet at (spawnRhachetCliBackground) —
// the brain's tui computes its escapes against this, so the emulator MUST match it or
// every wrapped row lands on the wrong grid line (V14 — geometry must track the pty)
const PTY_COLS = 120;
const PTY_ROWS = 40;

/**
 * .what = render a raw pty byte stream into an array of rendered grid rows
 * .why = this is the core mechanism the daemon's `read` will own: apply every
 *   cursor-move, clear, wrap, and scroll to a grid, then read what SITS at each row —
 *   never what was emitted in stream order. the dogfood proves the mechanism against a
 *   real brain before it is lifted into prod (todo 4).
 * .note = @xterm/headless parses `write` ASYNC, so the callback is awaited before any
 *   buffer read — else the read races the parse. `.buffer` is a PROPOSED api, so
 *   `allowProposedApi: true` is required or the read throws.
 */
const renderScreen = async (input: {
  stream: string;
  cols: number;
  rows: number;
}): Promise<string[]> => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Terminal } = require('@xterm/headless') as typeof import('@xterm/headless');
  const term = new Terminal({
    cols: input.cols,
    rows: input.rows,
    // a busy tui redraws heavily; a small scrollback lets an early turn scroll out of the read
    // window before a later poll samples it. hold the whole run so no captured turn is lost.
    scrollback: 100000,
    allowProposedApi: true,
  });
  await new Promise<void>((done) => term.write(input.stream, () => done()));

  const buffer = term.buffer.active;
  // read the whole live viewport plus its scrollback — baseY is the first viewport row
  // in buffer coords, so [0, baseY + rows) covers all rows the brain has rendered
  const lastRow = buffer.baseY + input.rows;
  // .note = deliberate mutation — a bounded row collector, local to this render
  const lines: string[] = [];
  for (let y = 0; y < lastRow; y++)
    lines.push(buffer.getLine(y)?.translateToString(true) ?? '');
  term.dispose();
  return lines;
};

/**
 * .what = the same render, PLUS each row with every dim cell blanked — the bright-only screen
 * .why = the dim attribute is the one signal that parts a brain-drawn ghost (its `Try "…"`
 *   placeholder, a contextual next-turn hint) from a human's typed work. prod keys the
 *   dirty/clear decision on it, so this dogfood MEASURES it against a real claude — the claim
 *   "the brain dims what it drew" is otherwise testimony (rule.require.playtest-via-real-dogfood)
 * .note = it calls prod's own `asBrightOnlyRow`, never a copy — a copy could drift and then
 *   measure a screen prod never sees. SEPARATE from `renderScreen` because the per-cell walk
 *   costs a pass over the whole scrollback, which a 200ms poll must not pay every tick
 */
const renderScreenWithDim = async (input: {
  stream: string;
  cols: number;
  rows: number;
}): Promise<{ lines: string[]; linesBright: string[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Terminal } = require('@xterm/headless') as typeof import('@xterm/headless');
  const term = new Terminal({
    cols: input.cols,
    rows: input.rows,
    scrollback: 100000,
    allowProposedApi: true,
  });
  await new Promise<void>((done) => term.write(input.stream, () => done()));

  const buffer = term.buffer.active;
  const lastRow = buffer.baseY + input.rows;
  const scratch = buffer.getNullCell();
  // .note = deliberate mutation — two bounded row collectors, local to this render
  const lines: string[] = [];
  const linesBright: string[] = [];
  // the cursor's ABSOLUTE row, exactly as prod computes it — a brain paints its block cursor by
  // re-emission of that one character at default intensity, so prod blanks the cursor-painted
  // cell on position rather than on intensity. this dogfood must model the SAME read or it would
  // measure a screen prod never sees (the whole reason it calls prod's `asBrightOnlyRow`)
  const cursorRow = buffer.baseY + buffer.cursorY;
  for (let y = 0; y < lastRow; y++) {
    const line = buffer.getLine(y);
    lines.push(line?.translateToString(true) ?? '');
    linesBright.push(
      line
        ? asBrightOnlyRow({
            line,
            scratch,
            cursorX: y === cursorRow ? buffer.cursorX : null,
          })
        : '',
    );
  }
  term.dispose();
  return { lines, linesBright };
};

/**
 * .what = the non-blank rendered rows, trimmed — the human-legible screen
 * .why = the grid is mostly empty; the signal is the few rows that carry text
 */
const nonBlank = (rows: string[]): string[] =>
  rows.map((r) => r.trimEnd()).filter((r) => r.length > 0);

/**
 * .what = poll a rendered-screen predicate until it holds or a deadline elapses — bounded
 * .why = a fixed sleep is a wall-clock BET on an external brain's render/submit latency: a slow
 *   ci runner or a momentarily-stalled brain-cli renders a capture NOT in the intended state
 *   (rule.forbid.behavior-hazards — the time-assumption class). a bounded deadline poll waits for
 *   the STATE the next `then` asserts, so the capture IS that state by construction; worst case it
 *   elapses at the same bound a fixed sleep would have burned. this is the same discipline the
 *   queued capture (state C) already used inline, lifted so every wait shares it.
 * .note = returns the last rendered rows and the elapsed ms — the elapsed ms measures render
 *   latency (Q11) for a caller that wants it.
 */
const pollRenderedUntil = async (input: {
  read: () => string;
  cols: number;
  rows: number;
  until: (rows: string[]) => boolean;
  boundMs: number;
}): Promise<{ rows: string[]; ms: number; held: boolean }> => {
  const deadline = Date.now() + input.boundMs;
  const startedAt = Date.now();
  // .note = deliberate mutation — a bounded render poll, local to this capture
  let rows: string[] = [];
  for (;;) {
    rows = await renderScreen({
      stream: input.read(),
      cols: input.cols,
      rows: input.rows,
    });
    if (input.until(rows))
      return { rows, ms: Date.now() - startedAt, held: true };
    if (Date.now() >= deadline)
      return { rows, ms: Date.now() - startedAt, held: false };
    await new Promise((wake) => setTimeout(wake, 200));
  }
};

/**
 * .what = the same bounded poll, against a DIM-AWARE render — returns the full and bright-only
 *   grids from ONE render moment
 * .why = 🔴 a state that is TRANSIENT cannot be captured by a cheap poll plus a later re-render.
 *   measured 2026-09-18: the queued capture polled the plain grid for m2's text, then re-rendered
 *   the cumulative stream for its dim pair — and by that later moment the brain had drained its
 *   queue, so the dim grid held an EMPTY band and the clamp read a state that no longer existed.
 *   a re-render of a cumulative stream always yields the LATEST screen, never the screen the poll
 *   stopped on, so the two reads were never of the same instant.
 * .note = it pays the per-cell dim walk every tick, which `renderScreenWithDim`'s .note warns
 *   against. that cost is accepted HERE and nowhere else: the predicate this poll stops on is
 *   itself dim-dependent (prod's `queued` read keys on a dim row), so a cheap poll cannot express
 *   it. correctness of the captured instant outranks the poll's tick cost.
 */
const pollRenderedWithDimUntil = async (input: {
  read: () => string;
  cols: number;
  rows: number;
  until: (grids: { lines: string[]; linesBright: string[] }) => boolean;
  boundMs: number;
}): Promise<{
  lines: string[];
  linesBright: string[];
  ms: number;
  held: boolean;
}> => {
  const deadline = Date.now() + input.boundMs;
  const startedAt = Date.now();
  // .note = deliberate mutation — a bounded render poll, local to this capture
  let grids: { lines: string[]; linesBright: string[] } = {
    lines: [],
    linesBright: [],
  };
  for (;;) {
    grids = await renderScreenWithDim({
      stream: input.read(),
      cols: input.cols,
      rows: input.rows,
    });
    if (input.until(grids))
      return { ...grids, ms: Date.now() - startedAt, held: true };
    if (Date.now() >= deadline)
      return { ...grids, ms: Date.now() - startedAt, held: false };
    await new Promise((wake) => setTimeout(wake, 200));
  }
};

// the outer pty geometry is a module constant, so a screen classifier read shares one shape
const asScreenLive = (
  lines: string[],
  linesBright?: string[],
): CloneScreenLive => ({
  live: true,
  lines,
  // .why default = `lines` — a capture that did not measure dim attributes models a screen
  //   with no ghost, which is the STRICTER fixture: every row counts as human work. the
  //   dim-aware captures pass the measured bright-only rows explicitly
  linesBright: linesBright ?? lines,
  cursorX: 0,
  cursorY: 0,
  cols: PTY_COLS,
  rows: PTY_ROWS,
});

/**
 * .what = dispatch a message through the shipped CLI (`rhx clone say`); a non-zero exit
 *   throws rather than returns
 * .why = the ACTION of an acceptance test rides the contract, per
 *   rule.require.acceptance.blackbox. `say` defaults to `--await enqueue`, so it returns
 *   the instant the brain HOLDS the message — which is exactly the window state C needs
 *   open, and the shipped verdict is itself the claim that the hold happened.
 * .note = a multi-line message rides `--what @stdin` rather than an argv value, because
 *   that is the surface a caller reaches for one — argv would make this test prove a
 *   path no daemon uses.
 * .note = the throw carries both streams, so a dispatch failure names its own cause
 *   rather than shows up later as an empty rendered grid
 */
const dispatchViaCli = (input: {
  dir: string;
  env: Record<string, string | undefined>;
  address: string;
  message: string;
}): { stdout: string; verdict: 'enqueued' | 'released' | 'other' } => {
  const multiline = input.message.includes('\n');
  const result = invokeRhachetCliBinary({
    binary: 'rhx',
    args: [
      'clone',
      'say',
      input.address,
      '--what',
      multiline ? '@stdin' : input.message,
    ],
    cwd: input.dir,
    env: input.env,
    ...(multiline ? { stdin: input.message } : {}),
    logOnError: false,
  });
  if (result.status !== 0)
    throw new MalfunctionError('a `clone say` dispatch did not exit 0', {
      address: input.address,
      message: input.message,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  return { stdout: result.stdout, verdict: asSayVerdict(result.stdout) };
};

/**
 * .what = which of the two SUCCESS verdicts a `clone say` reported, read off its own tree line
 * .why = 🔴 the shipped verdict is the only IN-BAND observation of whether the brain HELD the
 *   message, and `--await enqueue` returns while the hold is still live — so `enqueued` proves the
 *   queued screen existed microseconds ago, and `released` proves it never existed at all. both
 *   exit 0, so an exit-code read cannot part them (`dispatchViaCli` throws only on non-zero).
 * .note = 🔴 this parse is what retires a wall-clock BET. state C samples the queued screen from
 *   OUTSIDE the daemon, and its window is set by how fast the brain streams — NETWORK-bound —
 *   while every observer step (a `clone say` subprocess boot, a stream re-parse, a grid walk) is
 *   CPU-bound. so a contended host slows the observer and does NOT widen the window, and the two
 *   drift apart with no bound that closes the gap (`rule.forbid.time-assumptions`). measured
 *   2026-09-18 in an 11-suite tier: the sampler DID find m2 on the grid and `queued` never held,
 *   which is the signature of a drained queue rather than a missed sample.
 * .note = it keys on the verdict's first phrase, never on the whole line — the `enqueued` line
 *   carries a caveat branch below it and the `released` line carries optional degrade branches
 *   (computeCloneSayReport's snapshots), so a whole-line match would break on a degrade that this
 *   read does not care about
 */
const asSayVerdict = (stdout: string): 'enqueued' | 'released' | 'other' => {
  if (stdout.includes('🎙️ enqueued for ')) return 'enqueued';
  if (stdout.includes('🎙️ said to ')) return 'released';
  return 'other';
};

describe('screen dogfood — a real brain-cli renders its input states (real acceptance)', () => {
  given('[case1] a live claude, freshly enrolled and idle', () => {
    const scene = useBeforeAll(async () => {
      const { binDir } = getRealClaudeOrThrow();

      const dir = genTempDir({ slug: 'clone-screen-dogfood' });
      setupEnrollFixture({ dir });
      setRealClaudeFirstRunAccepted({ dir });

      const env = { PATH: `${binDir}:${process.env.PATH ?? ''}` };
      const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });

      const repoPath = getOneRepoPath({ from: dir });
      const clone = getOneCloneByRef({
        repoPath,
        ref: asCloneRef({ raw: enrolled.address }),
      });
      if (clone === null)
        throw new MalfunctionError('the enrolled clone was not found on disk', {
          address: enrolled.address,
        });
      return { dir, env, repoPath, clone, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the three input states are captured and rendered', () => {
      const observed = useBeforeAll(async () => {
        // ── state A: IDLE — the input box at rest, right after ready ──
        // captured WITH dim attributes: the idle box holds the brain's own greyed placeholder,
        // which is the cheapest live specimen of the ghost text that made a peer permanently
        // deaf (the color-blind-classifier defect). the `then` below measures that it IS dim
        const idle = await renderScreenWithDim({
          stream: scene.bg.getOutput(),
          cols: PTY_COLS,
          rows: PTY_ROWS,
        });
        const rowsIdle = idle.lines;
        const rowsIdleBright = idle.linesBright;

        // ── state B: DIRTY INPUT — type raw keystrokes, do NOT submit ──
        // this is the human-mid-type case the pre-check must refuse (R4, case=2)
        const dirty = `DIRTY-${Date.now().toString(36)}`;
        scene.bg.write(dirty);
        // poll until the typed keystrokes echo into the input region — a fixed sleep would
        // bet on the brain's echo latency (rule.forbid.behavior-hazards)
        const rowsDirty = (
          await pollRenderedUntil({
            read: () => scene.bg.getOutput(),
            cols: PTY_COLS,
            rows: PTY_ROWS,
            until: (rows) => nonBlank(rows).some((r) => r.includes(dirty)),
            boundMs: 15000,
          })
        ).rows;
        // clear the dirty region so it does not corrupt the queued capture — a ctrl-U
        // kills the input line; poll until the region reads `clear` again (the kill rendered)
        scene.bg.write('\u0015');
        await pollRenderedUntil({
          read: () => scene.bg.getOutput(),
          cols: PTY_COLS,
          rows: PTY_ROWS,
          until: (rows) =>
            computeCloneInputState({ screen: asScreenLive(rows), message: dirty })
              .input === 'clear',
          boundMs: 15000,
        });

        // ── state C: QUEUED — a message held behind an in-flight turn ──
        // M1 keeps the brain busy; M2 dispatched into that turn sits enqueued. `say`
        // returns at its `enqueued` verdict, so M2 is observable while still held.
        //
        // 🔴 the arrange is GATED ON M2'S OWN VERDICT, and that is the whole repair. state C is
        //   a TRANSIENT window — open exactly while m1's turn runs — and a sampler that only
        //   watches the screen cannot part "the window opened and I missed it" from "the window
        //   never opened". so the capture used to assert against a state the brain may never have
        //   entered, and reported `queuedHeld: false` for both causes.
        //   ⇒ `say --await enqueue` returns WHILE THE HOLD IS LIVE, so its verdict answers that
        //   question in-band, before a single row is rendered (asSayVerdict):
        //   | m2's verdict | what it proves | what this arrange does |
        //   |---|---|---|
        //   | `enqueued` | the brain HELD it, microseconds ago | sample — a miss is now a REAL defect |
        //   | `released` | m1's turn had already ended; no queued screen ever existed | re-arrange with a wider window |
        //   ⇒ so the poll below only ever runs against a window the CONTRACT says is open, and no
        //   assert is ever made about a state the brain did not enter.
        // 🔴 and the escalation is the one lever that widens rather than races: measured
        //   2026-09-18, a print of 400 lost its window under a FULL-tier run (contended by 125
        //   peer suites) where the same code held on a scoped run. the window is set by how fast
        //   the brain streams — NETWORK-bound — while every observer step is CPU-bound, so a
        //   contended host slows the observer and leaves the window exactly as wide
        //   (`rule.forbid.time-assumptions`). a longer task is the only knob on the window's own
        //   side, and once m1's turn has ended no poll bound recovers a drained queue.
        // .note = a print task, deliberately — its duration scales with the count and it needs
        //   no tool call, so the window widens with no new permission surface (case=6's prompt
        //   defect is exactly what a tool-call task would risk here)
        // .note = the counts ESCALATE rather than repeat: a re-arrange at the same width would
        //   re-run the identical bet, and a bet re-rolled is not a bound (rule.forbid.failhide).
        //   each attempt also leaves the prior m2 as a turn the brain must still run, so a later
        //   attempt's m1 is itself more likely to queue — the retry compounds in its own favor.
        const queuedArrangeCounts = [400, 1200, 3000];
        // .note = deliberate mutation — a bounded arrange loop with a trail, local to this capture
        const queuedTrail: {
          printCount: number;
          verdict: 'enqueued' | 'released' | 'other';
        }[] = [];
        let m2 = '';
        // the stdout of the m2 dispatch, carried so its masked head can be snapped. it is the
        // one say tree this journey drives through the shipped contract, and the mask drops both
        // volatile fields (the verdict word, the address), so the key is stable across rungs
        let m2SayStdout = '';
        let queued: Awaited<ReturnType<typeof pollRenderedWithDimUntil>> = {
          lines: [],
          linesBright: [],
          ms: 0,
          held: false,
        };
        for (const printCount of queuedArrangeCounts) {
          const m1 = `Print each integer from 1 to ${printCount}, one per line, and no other text.`;
          dispatchViaCli({
            dir: scene.dir,
            env: scene.env,
            address: scene.address,
            message: m1,
          });
          // poll until M1's own text has LEFT the input box AND rendered as a submitted turn
          // (it committed, the brain is now busy), so M2 dispatched next sits enqueued — never a
          // fixed bet on the submit+turn latency
          await pollRenderedUntil({
            read: () => scene.bg.getOutput(),
            cols: PTY_COLS,
            rows: PTY_ROWS,
            until: (rows) => {
              const state = computeCloneInputState({
                screen: asScreenLive(rows),
                message: m1,
              });
              return state.countInInput === 0 && state.countOnScreen >= 1;
            },
            boundMs: 30000,
          });
          m2 = `QUEUED-${Date.now().toString(36)}`;
          const said = dispatchViaCli({
            dir: scene.dir,
            env: scene.env,
            address: scene.address,
            message: m2,
          });
          queuedTrail.push({ printCount, verdict: said.verdict });
          m2SayStdout = said.stdout;
          // the window never opened — re-arrange wider rather than sample a state that is not
          // there. NOT a swallowed failure: an exhausted loop throws below, naming every attempt.
          if (said.verdict !== 'enqueued') continue;

          // poll the RENDERED grid until m2 shows AND prod's own `queued` read fires, bounded —
          // this measures render latency (Q11): the floor a `--await` poll must respect.
          //
          // 🔴 the poll is DIM-AWARE and the predicate is prod's read, so all three grids below
          //   come from ONE render moment and that moment IS a queued state by construction.
          //   measured 2026-09-18: a cheap poll on m2's text alone stopped on a screen where m2
          //   had already rendered as a SUBMITTED turn — m2's text is on the grid in both the
          //   held and the released case — and the later dim re-render then read a drained queue.
          //   prod's `queued` is the only predicate that parts the two, and it needs the dim pair.
          queued = await pollRenderedWithDimUntil({
            read: () => scene.bg.getOutput(),
            cols: PTY_COLS,
            rows: PTY_ROWS,
            until: (grids) =>
              grids.lines.some((r) => r.includes(m2)) &&
              computeCloneInputState({
                screen: asScreenLive(grids.lines, grids.linesBright),
                message: m2,
              }).queued,
            // 30s, the same bound its two sibling polls carry — a 20s bound here was the tightest
            // in the capture while its predicate is the STRICTEST (two conditions, one of them a
            // dim read), which is backwards
            boundMs: 30000,
          });
          // 🔴 the ladder climbs on a SAMPLE miss too, never only on a verdict miss. measured
          //   2026-09-19: an unconditional `break` here left the escalation unreachable in the
          //   exact case it was built for — `trail: [{ printCount: 400, verdict: 'enqueued' }]`,
          //   with 1200 and 3000 never attempted. the two misses are DIFFERENT events:
          //   | the miss | what closed the window |
          //   |---|---|
          //   | verdict ≠ `enqueued` | m1s turn ended BEFORE m2 landed — the brain never held it |
          //   | verdict `enqueued`, `held: false` | the brain DID hold it, and the hold ended before
          //     this polls first rendered sample — a narrower window, same knob |
          //   ⇒ both want a LONGER m1, so both belong on this ladder. to break on the first is to
          //   re-roll one bet and call it a bound (rule.forbid.failhide)
          if (queued.held) break;
        }
        // 🔴 the ladder exhausted with no sampled queued screen. the throw NAMES which of the two
        //   causes it is, because they take opposite repairs and the trail alone reads alike
        //   (rule.require.failloud):
        //   - no attempt ever reported `enqueued` → the window never opened at any width
        //   - an attempt reported `enqueued` and no poll ever read a queued grid → the brains own
        //     read saw the hold and this test's re-emulation could not, even at 3000 lines. that is
        //     a defect in the READ, never a window too narrow
        if (!queued.held) {
          const heldAnAttempt = queuedTrail.some(
            (row) => row.verdict === 'enqueued',
          );
          throw new MalfunctionError(
            heldAnAttempt
              ? 'a `clone say` reported `enqueued` at every rung, and no render poll ever read a queued grid — the brain HELD the message and the screen read could not see it'
              : 'no `clone say` reported `enqueued`, so the brain never held a message and no queued screen existed to sample',
            {
              trail: queuedTrail,
              hint: heldAnAttempt
                ? 'the daemons own `computeCloneInputState` answered `queued` (thats what minted the `enqueued` verdict) while this tests re-emulation of the same stream did not. read the dim queue-hint clause in computeCloneInputState against the captured grids — a lost DIM attribute in the test feed reads as an empty queue'
                : 'every attempt released straight through, so m1s turn ended before m2 landed. raise the print counts, or read the verdicts above for a `withheld`/`other` that names a different cause',
            },
          );
        }
        // .note = ONE full grid, never a full/dim pair of names — they were two labels for one
        //   read the moment the poll became dim-aware, and a second label for one value invites
        //   a future reader to believe the two came from different renders
        const rowsQueued = queued.lines;
        const rowsQueuedBright = queued.linesBright;
        // the elapsed ms is the latency ONLY when the queued state was actually reached; a miss
        // stays -1
        const queuedAtMs = queued.held ? queued.ms : -1;

        // .note = Q10 has two halves, split across two `given`s because they need OPPOSITE
        //   brain states. this capture serves the READ half: state C leaves the brain busy, so
        //   its screen is genuinely multi-row and proves the region read spans rows. the
        //   DISPATCH half needs an IDLE brain to render a paste promptly, so it lives in
        //   [case2] on its own clone — measured 2026-09-17: a paste into a brain congested by
        //   m1's print task did not render within a 60s bound.

        // ── emit the measured grids to a research artifact for the build to read ──
        // .note = written to the hermetic temp dir, NEVER the tracked `.behavior/` tree — a
        //   run carries a per-run epoch + serials, so a write into a committed file would
        //   dirty the tree non-hermetically each run. the stable representative capture is
        //   checked in separately at 5.1.execution.research.screens.captured.md
        const section = (title: string, rows: string[]): string =>
          [`## ${title}`, '```', ...nonBlank(rows), '```', ''].join('\n');
        writeFileSync(
          join(scene.dir, '5.1.execution.research.screens.captured.md'),
          [
            '# 5.1 research — measured brain-cli screens (real haiku)',
            '',
            `captured at epoch ${Date.now()} at ${PTY_COLS}x${PTY_ROWS}`,
            '',
            section('state A — idle (input box at rest)', rowsIdle),
            section(`state B — dirty input (typed "${dirty}", unsubmitted)`, rowsDirty),
            section(`state C — queued (m2="${m2}" behind an in-flight turn)`, rowsQueued),
            `render latency (m2 first on rendered grid): ${queuedAtMs}ms`,
            '',
          ].join('\n'),
          'utf-8',
        );

        return {
          rowsIdle,
          rowsIdleBright,
          rowsDirty,
          dirty,
          rowsQueued,
          rowsQueuedBright,
          // whether the poll REACHED the queued state, over elapsed at its bound. carried
          // because a miss makes every state-C grid a drained screen, and a `then` that reads
          // one without this flag reports an empty band — a symptom two hops from its cause
          queuedHeld: queued.held,
          m2,
          m2SayStdout,
          queuedAtMs,
          // the arrange trail — one row per attempt, with the verdict that decided it. carried so
          // a `queuedHeld: false` names which of the two causes it is: an `enqueued` row present
          // means the window WAS open and the sampler missed it (a real defect); its absence can
          // no longer reach here at all, since the throw above fires first
          queuedTrail,
        };
      });

      then('[Q7] the idle screen renders a locatable input region', () => {
        // the real premise invariant 1 rests on: the input BAND is locatable on the
        // captured screen — not merely that SOME row rendered. prove it with the exact
        // classifier prod keys on: `computeCloneInputState` returns `focus: 'input'`
        // ONLY when `getInputBand` found the `❯` region fenced by a full-width `─` rule
        // pair at the viewport foot (measured, real haiku v2.1.87). a screen with no
        // band classifies `unrecognized`; a menu classifies `modal` — both fail this.
        // the idle box holds only the placeholder, so the region reads `clear`
        const state = computeCloneInputState({
          screen: asScreenLive(observed.rowsIdle, observed.rowsIdleBright),
          message: '',
        });
        expect(state.focus).toBe('input');
        expect(state.input).toBe('clear');
      });

      then('[Q7] the brain draws its own box text DIM — the ghost signal is real', () => {
        // 🔴 THE measurement the color-blind-classifier cure rests on. prod keys the
        // dirty/clear decision on the DIM attribute: the brain dims what IT drew and leaves
        // what the HUMAN typed at default intensity, so an all-dim box holds no human work.
        // that claim was TESTIMONY until this clamp — and a wrong claim there is not a rough
        // read, it is a clone that refuses every `say` forever (measured 2026-09-17: a peer
        // went deaf on `❯ now reply with exactly: …`, its own suggested next turn).
        //
        // 🔴 the specimen is state C's QUEUE HINT row, never the idle placeholder.
        //   measured 2026-09-18 against claude v2.1.87: an IDLE box renders its band with NO
        //   text at all — `❯` plus the cursor cell and no placeholder — so the vacuity guard
        //   below fired on an empty full-screen read and the clamp could prove naught. the
        //   brain's OWN queue hint (`❯ Press up to edit queued messages`, drawn inside the
        //   band while its queue holds) is a strictly better specimen on both counts: it is
        //   provably present at this version, and it is the exact cell prod's `queued` read
        //   keys on — so a dim regression here breaks the `enqueued`/`released` split itself.
        // .note = the CLAIM is unchanged (`rule.forbid.test-intent-violations`) — the brain
        //   dims what it drew, full carries it, bright-only does not. only the live cell the
        //   claim is measured against moved, to one this brain version actually renders.
        const bandOf = (rows: string[]): string[] => {
          const ruleRows = rows
            .map((row, index) => ({ row: row.trim(), index }))
            .filter((it) => /^─+$/.test(it.row) && it.row.length >= 20)
            .map((it) => it.index);
          if (ruleRows.length < 2) return [];
          return rows.slice(
            ruleRows[ruleRows.length - 2]! + 1,
            ruleRows[ruleRows.length - 1]!,
          );
        };
        const contentOf = (rows: string[]): string =>
          rows
            .map((row) => row.replace(/^\s*❯\s?/, '').trim())
            .join('\n')
            .trim();

        // 🔴 asserted as ONE object so a failure NAMES the grid it read (rule.require.failloud).
        //   the prior shape asserted `full.length > 0` alone, and its failure said only
        //   `Expected: > 0 / Received: 0` — which cannot part "the band was absent" from "the
        //   band was found and held no text", and those take opposite repairs. one wasted
        //   round each way, measured 2026-09-18
        // asserted FIRST: every grid this `then` reads is state C's, and state C is only state C
        // when the poll reached it. a miss leaves a DRAINED screen in the same variables, whose
        // band is legitimately empty — so without this line the failure below reads as a dim
        // regression when the true cause is a window that closed (measured 2026-09-18, one
        // wasted diagnosis)
        //
        // 🔴 asserted WITH the arrange trail, so the failure names which cause it is. the arrange
        //   now throws when no attempt reported `enqueued`, so a `false` that reaches HERE means
        //   the brain DID hold the message and the sampler still missed the screen — a real defect
        //   in the read, never a window that never opened. the trail proves that in the diff
        //   itself rather than leaves it to a log hunt (rule.require.failloud)
        expect({
          queuedHeld: observed.queuedHeld,
          heldAnAttempt: observed.queuedTrail.some(
            (row) => row.verdict === 'enqueued',
          ),
          trail: observed.queuedTrail,
        }).toEqual({
          queuedHeld: true,
          heldAnAttempt: true,
          trail: observed.queuedTrail,
        });

        const full = contentOf(bandOf(observed.rowsQueued));
        expect({
          // the full screen carries the hint — else this measures an empty band and would pass
          // vacuously, whatever the dim attribute does. and it must be the brain's OWN hint,
          // never a stray row, so a render that drops the hint fails HERE rather than silently
          // re-opens the vacuous pass
          full,
          // and the bright-only screen of the SAME band is empty — the hint is dim, every cell
          bright: contentOf(bandOf(observed.rowsQueuedBright)),
          // the reads the diagnosis needs when either of the two above surprises — a band that
          // was never located reads `[]`, one located and empty reads its own rows, and the two
          // take opposite repairs
          bandRows: bandOf(observed.rowsQueued).length > 0,
          bandLocated: bandOf(observed.rowsQueuedBright).length > 0,
        }).toEqual({
          full: expect.stringMatching(/Press up to edit queued/),
          bright: '',
          bandRows: true,
          bandLocated: true,
        });
      });

      then('[Q7] the typed-but-unsubmitted text renders in the input region', () => {
        // the dirty keystrokes echo onto the rendered grid — this is the `buffered`
        // state the pre-check must detect and refuse (R4)
        const dirty = nonBlank(observed.rowsDirty);
        expect(dirty.some((r) => r.includes(observed.dirty))).toBe(true);
      });

      then('[Q6/Q11] the queued message renders on the grid within the poll floor', () => {
        expect(observed.rowsQueued.some((r) => r.includes(observed.m2))).toBe(true);
        // render latency is bounded — the floor a `--await` poll respects
        expect(observed.queuedAtMs).toBeGreaterThanOrEqual(0);
        expect(observed.queuedAtMs).toBeLessThan(20000);
      });

      then('the LIVE m2 say head is a success tree, and the masker proves it', () => {
        // 🔴 the masked HEAD is a constant, and that is why this is an assert rather than a
        // snapshot. `asCloneSayHeadSnapshotSafe` replaces the verdict with `<verdict>` and
        // `@:\S+.*$` with `@:<address>` — the tail replacement eats the WHOLE remainder — so
        // every success head in every suite collapses to the same one string,
        // `😶🎙️ <verdict> @:<address>`, already locked at
        // `__snapshots__/clone.transcript-lag.realbrain.acceptance.test.ts.snap`. a third key
        // on that constant carries no detection power; what actually detects a drifted head is
        // the masker's OWN guard, which throws a ConstraintError on a head that is not
        // `😶🎙️ (said to|enqueued for) @:…`. ⇒ so the guard is the detector, and this row runs it
        expect(
          asCloneSayHeadSnapshotSafe({ stdout: observed.m2SayStdout }),
        ).toEqual('😶🎙️ <verdict> @:<address>');
      });

      then('[Q10] the region read covers a multi-row screen (V — the region rationale)', () => {
        // V's region rationale: the read classifies a REGION across several rows, never a
        // single row — because a REAL brain screen IS multi-row. prove it against the queued
        // capture, which the brain rendered across many rows (m1's turn plus its output) and
        // within which the region read located m2 (Q6). a row-scoped read would miss content
        // off the band's row.
        // .note = this is the READ half of Q10; the DISPATCH half is clamped in [case2] against
        //   a real 3-line bracketed-paste say. both are owed: a frame that lands every line is
        //   useless if the read only ever looks at one row, and the reverse holds too.
        const screen = nonBlank(observed.rowsQueued);
        expect(screen.length).toBeGreaterThanOrEqual(2); // the real screen is genuinely multi-row
        const state = computeCloneInputState({
          screen: asScreenLive(observed.rowsQueued),
          message: observed.m2,
        });
        // the region read found m2 among the many rows — it read a REGION, not a lone row
        expect(state.countOnScreen).toBeGreaterThanOrEqual(1);
      });
    });
  });

  given('[case2] a live claude, freshly enrolled and idle — for a multi-line say', () => {
    // .why a SECOND clone = the dispatch half of Q10 needs an IDLE brain. [case1] state C
    //   deliberately congests its brain with a 60-line task and leaves it congested, so a
    //   paste dispatched into that scene does not render within a generous bound (measured
    //   2026-09-17, 60s). the read half and the dispatch half want opposite brain states, so
    //   each gets its own clone rather than one fragile sequence.
    const scene = useBeforeAll(async () => {
      const { binDir } = getRealClaudeOrThrow();

      const dir = genTempDir({ slug: 'clone-screen-dogfood-multiline' });
      setupEnrollFixture({ dir });
      setRealClaudeFirstRunAccepted({ dir });

      const env = { PATH: `${binDir}:${process.env.PATH ?? ''}` };
      const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });

      const repoPath = getOneRepoPath({ from: dir });
      const clone = getOneCloneByRef({
        repoPath,
        ref: asCloneRef({ raw: enrolled.address }),
      });
      if (clone === null)
        throw new MalfunctionError('the enrolled clone was not found on disk', {
          address: enrolled.address,
        });
      return { dir, env, repoPath, clone, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] a three-line message is dispatched', () => {
      const observed = useBeforeAll(async () => {
        const mlTag = `ML-${Date.now().toString(36)}`;
        const mlLines = [`${mlTag}-alpha`, `${mlTag}-bravo`, `${mlTag}-charlie`];
        dispatchViaCli({
          dir: scene.dir,
          env: scene.env,
          address: scene.address,
          message: mlLines.join('\n'),
        });
        // poll the RENDERED grid until every line shows — a fixed sleep would bet on the
        // brain's paste-commit latency (rule.forbid.behavior-hazards)
        const rowsMulti = (
          await pollRenderedUntil({
            read: () => scene.bg.getOutput(),
            cols: PTY_COLS,
            rows: PTY_ROWS,
            until: (rows) =>
              mlLines.every((line) =>
                nonBlank(rows).some((r) => r.includes(line)),
              ),
            boundMs: 60000,
          })
        ).rows;

        // then poll the TRANSCRIPT for the joined message as ONE turn — the authoritative
        // read, and the only one that parts the four mechanisms (see the `then` below)
        const joined = mlLines.join('\n');
        const deadline = Date.now() + 60000;
        // .note = deliberate mutation — a bounded poll counter local to this loop
        let turnsJoined = 0;
        while (turnsJoined < 1 && Date.now() < deadline) {
          genCloneHistoryRelink({
            repoPath: scene.repoPath,
            clone: scene.clone,
          });
          turnsJoined = getCloneSubmittedCount({
            clone: scene.clone,
            message: joined,
          });
          if (turnsJoined < 1)
            await new Promise((wake) => setTimeout(wake, 250));
        }

        return { mlLines, rowsMulti, joined, turnsJoined };
      });

      then('[Q10] the three lines commit as ONE turn, VERBATIM', () => {
        // 🔴 THE clamp on the multi-line cure. `getCloneSubmittedCount` matches the message
        // JSON-ESCAPED, so the needle is `alpha\nbravo\ncharlie` — present in the transcript
        // only if the brain recorded the three lines as a SINGLE user turn with real newlines
        // between them. it catches BOTH mechanisms this cure rejected:
        //   `\x1b\r` (ESC+CR, the PRIOR mechanism, and the defect this cure closes) — the ESC
        //     is eaten, every line but the LAST is discarded, so the needle never appears.
        //     mutation-dogfooded 2026-09-17: this clamp went RED (0), as did the render clamp
        //   `\` + CR — honored, but each non-final line keeps a literal `\` at its end, so the
        //     transcript holds `alpha\\\nbravo` and the needle misses
        // .what it does NOT catch, measured: a RAW `\n` bulk write. mutation-dogfooded
        //   2026-09-17 by a dropped paste wrap — the clamp stayed GREEN, so claude-code
        //   v2.1.87 inserts a raw `\n` into the box rather than submits at it. that is an
        //   INCIDENTAL property of one version, never a contract: `\r` is what a terminal
        //   sends for Enter, so a version that binds `\n` too would split the turn. bracketed
        //   paste is the terminal PROTOCOL for "insert these bytes, interpret no key", so it
        //   holds by spec rather than by luck. the MECHANISM is pinned by the unit clamp
        //   (asCloneDispatchFrame.test.ts asserts the markers); this clamps the OUTCOME.
        expect(observed.turnsJoined).toBe(1);
      });

      then('[Q10] and they render across several rows (the multi-row height)', () => {
        // the render half — weaker than the turn clamp above, and still owed: the caller's
        // bytes must reach the SCREEN across rows, not merely the transcript
        const screen = nonBlank(observed.rowsMulti);
        const rowsHit = observed.mlLines.map((line) =>
          screen.findIndex((r) => r.includes(line)),
        );
        // every line survived the dispatch — no byte of the caller's message was discarded
        expect(
          observed.mlLines.filter((_, index) => rowsHit[index]! < 0),
        ).toEqual([]);
        // and they occupy DISTINCT rows — one shared row would mean the newlines were eaten
        // and the lines concatenated
        expect(new Set(rowsHit).size).toBe(observed.mlLines.length);
        // no paste-marker text leaked into the rendered message
        for (const row of rowsHit) expect(screen[row]).not.toContain('200~');
      });
    });
  });
});
