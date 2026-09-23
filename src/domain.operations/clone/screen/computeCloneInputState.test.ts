import { computeCloneInputState } from './computeCloneInputState';
import type { CloneScreenLive } from './genCloneScreenFeed';

/**
 * .what = a live screen from a set of rendered rows, at a fixed geometry — every row BRIGHT
 * .why = the geometry fields ride along so the fixture is a real CloneScreenLive, never a
 *   partial cast. `linesBright` mirrors `lines`, which models a screen the brain dimmed NO cell
 *   of — the strictest fixture, since every row then counts as human work and the classifier
 *   must reach `dirty` on its own evidence. a dim fixture is built by `asScreenWithDim`
 */
const asScreen = (lines: string[]): CloneScreenLive => ({
  live: true,
  lines,
  linesBright: lines,
  cursorX: 0,
  cursorY: 0,
  cols: 120,
  rows: 40,
});

/**
 * .what = a live screen where the rows named by `dim` render DIM — the brain's own ghost text
 * .why = the brain greys what IT drew (its `Try "…"` placeholder, a contextual next-turn hint)
 *   and leaves what the human typed at default intensity. `linesBright` blanks every dim row,
 *   which is exactly what genCloneScreenFeed's per-cell read produces for an all-dim row
 */
const asScreenWithDim = (input: {
  lines: string[];
  dim: number[];
}): CloneScreenLive => ({
  ...asScreen(input.lines),
  linesBright: input.lines.map((line, index) =>
    input.dim.includes(index) ? '' : line,
  ),
});

const RULE = '─'.repeat(120);

// the box band the brain draws at the viewport foot — a `❯` row fenced by two full-width rules
const IDLE_LINES = [
  '● prior turn output',
  RULE,
  '❯ Try "write a test for <filepath>"',
  RULE,
  '                           3 claude.ai connectors need auth · /mcp',
];

const DIRTY_LINES = [RULE, '❯ DIRTY-mu03aque', RULE];

// M1 submitted (scrolled up), M2 sits in the box — the `buffered` shape.
// 🟡 the name reads `QUEUED` and the state is NOT `enqueued`: M2 was never submitted, so the
// brain's queue is empty and no dim hint is drawn. what makes this `buffered` is precisely that
// the message is still IN the box. the `enqueued` shape needs the hint row (see the queue-hint
// block below), which no fixture here carries
const QUEUED_LINES = [
  '❯ Print each integer from 1 to 60, one per line, and no other text.',
  '● 1',
  '  2',
  '  3',
  RULE,
  '❯ QUEUED-mu03avtp',
  RULE,
];

// a `❯`-led option menu with a confirm footer — the modal signature
const MODAL_LINES = [
  '❯ 1. Yes',
  '  2. No',
  'Do you want to proceed?',
  RULE,
  '❯',
  RULE,
];

const TEST_CASES: {
  description: string;
  given: { lines: string[]; message: string };
  expect: {
    focus: 'input' | 'modal' | 'unrecognized';
    input: 'clear' | 'dirty';
    countInInput: number;
    countOnScreen: number;
    /**
     * .what = optional, and defaults to `false` — an EMPTY queue
     * .why = not one fixture below draws the dim queue hint, so every case here reads an empty
     *   queue. the default states that once rather than nine times, and a case may override it.
     *   the queue read itself is clamped in its own describe block (`the dim queue hint`), where
     *   the dim/bright pair it rests on is the subject rather than an incidental field
     */
    queued?: boolean;
  };
}[] = [
  {
    description: 'idle box holds the placeholder → focus input, region clear',
    given: { lines: IDLE_LINES, message: 'never-on-screen' },
    expect: {
      focus: 'input',
      input: 'clear',
      countInInput: 0,
      countOnScreen: 0,
    },
  },
  {
    description: 'a human typed into the box → focus input, region dirty',
    given: { lines: DIRTY_LINES, message: 'never-on-screen' },
    expect: {
      focus: 'input',
      input: 'dirty',
      countInInput: 0,
      countOnScreen: 0,
    },
  },
  {
    description:
      'our sentinel sits in the box while M1 runs → dirty box, count rises in band and on screen',
    given: { lines: QUEUED_LINES, message: 'QUEUED-mu03avtp' },
    expect: {
      focus: 'input',
      input: 'dirty',
      countInInput: 1,
      countOnScreen: 1,
    },
  },
  {
    description: 'an option menu with a confirm footer → focus modal, refuse',
    given: { lines: MODAL_LINES, message: 'never-on-screen' },
    expect: {
      focus: 'modal',
      input: 'clear',
      countInInput: 0,
      countOnScreen: 0,
    },
  },
  {
    description: 'no box band present → focus unrecognized',
    given: {
      lines: ['● just some output', '  no rendered fence'],
      message: 'never-on-screen',
    },
    expect: {
      focus: 'unrecognized',
      input: 'clear',
      countInInput: 0,
      countOnScreen: 0,
    },
  },
  {
    description:
      'the sentinel echoes in the live box, a scrolled-up box, and a reply line → countOnScreen 3, countInInput 1',
    given: {
      lines: ['❯ ECHO-x9', '● reply about ECHO-x9', RULE, '❯ ECHO-x9', RULE],
      message: 'ECHO-x9',
    },
    expect: {
      focus: 'input',
      input: 'dirty',
      countInInput: 1,
      countOnScreen: 3,
    },
  },
  {
    // r7-i003-b1: a human's own box content that opens `1. …` renders `❯ 1. …`, which a
    // MODAL_MARKER matches. the box band must be EXCLUDED from the modal scan, else this
    // reads `modal` — an unforceable refusal — and a busy driver goes permanently deaf
    description:
      'a human box content that opens `1. …`, no prompt above → focus input, dirty (forceable), not modal (r7-i003-b1)',
    given: {
      lines: ['● prior turn output', RULE, '❯ 1. buy the milk and eggs', RULE],
      message: 'never-on-screen',
    },
    expect: {
      focus: 'input',
      input: 'dirty',
      countInInput: 0,
      countOnScreen: 0,
    },
  },
  {
    // r7-i003-b1 (second marker): box content that carries "to confirm" must not read modal
    description:
      'a human box content that carries "to confirm", no prompt above → focus input, dirty, not modal (r7-i003-b1)',
    given: {
      lines: ['● prior turn output', RULE, '❯ ok to confirm the plan?', RULE],
      message: 'never-on-screen',
    },
    expect: {
      focus: 'input',
      input: 'dirty',
      countInInput: 0,
      countOnScreen: 0,
    },
  },
  {
    // r010-i021-b1: a MULTI-LINE message renders across the box as `❯ line1` / `  line2` — each
    // interior `\n` a real line in the box, via the bracketed paste asCloneDispatchFrame wraps a
    // multi-line message in. the rise counter must match a needle
    // that carries `\n` across those rows. before the join fix, a per-row `indexOf` of the raw
    // needle could never match one row, so countInInput came back 0 for EVERY multi-line message
    // and the say fell through to `absent` — a false failure on a message that landed (R1). this
    // case goes 0 → 1 with the fix, so it bites the exact defect.
    //
    // 🟡 countOnScreen rose 0 → 1 on 2026-09-20, when the match gained a whitespace collapse for
    // the soft-wrap defect. it had read 0 because the raw screen rows keep their `❯`/indent
    // prefixes, and that 0 was labelled a fail-SAFE under-count toward `absent`. the collapse
    // makes the prefixes immaterial, so the read is now correct rather than merely safe — a
    // strictly better answer on the same fixture
    description:
      'a multi-line message sits in the box → countInInput rises across rows (r010-i021-b1)',
    given: {
      lines: [RULE, '❯ do the first task', '  do the second task', RULE],
      message: 'do the first task\ndo the second task',
    },
    expect: {
      focus: 'input',
      input: 'dirty',
      countInInput: 1,
      countOnScreen: 1,
    },
  },
];

// ── the SOFT-WRAP defect ──────────────────────────────────────────────────────────────────
//
// 🔴 measured 2026-09-20 against this session's own clone: a 147-char self-say at `cols=98`
// rendered across two rows, the count never rose, and a message that plainly landed reported
// `absent` — the R1 false failure the wish exists to kill, from the opposite direction.
//
// the prior docblock asserted this was impossible: *"a SINGLE-line needle holds no `\n`, so it
// can never span the inserted separator."* it can — the RENDERER breaks it. two mechanisms split
// one logical message across rows, and only the first had been handled:
//   - an interior `\n`  → asCloneDispatchFrame lands it as a real row  (handled since r010)
//   - a terminal WRAP   → the renderer breaks at a word boundary       (this block)
//
// the cure is a whitespace collapse on BOTH sides of the match. these clamp each region the
// defect reaches, and the partial-fragment row below keeps the collapse from over-match
describe('computeCloneInputState — a soft-wrapped message (r029)', () => {
  // a narrow screen, so a short fixture message genuinely wraps
  const NARROW = '─'.repeat(40);
  const asNarrowScreen = (lines: string[]): CloneScreenLive => ({
    live: true,
    lines,
    linesBright: lines,
    cursorX: 0,
    cursorY: 0,
    cols: 40,
    rows: 40,
  });

  const MESSAGE = 'switch back to opus via npx rhx clone say with a model flag';

  test('a wrapped message in the QUEUED region → countOnScreen rises (the enqueued read)', () => {
    // the exact shape the live defect took: our payload above the band, broken across two rows
    // with the continuation indented, and the box clear beneath it. before the collapse this
    // counted 0 and the say reported `absent` on a message the brain held
    const state = computeCloneInputState({
      screen: asNarrowScreen([
        '❯ switch back to opus via npx rhx clone',
        '  say with a model flag',
        NARROW,
        '❯',
        NARROW,
      ]),
      message: MESSAGE,
    });
    expect(state.focus).toEqual('input');
    expect(state.countOnScreen).toEqual(1);
  });

  test('a wrapped message in the INPUT BOX → countInInput rises, so `buffered` stays reachable', () => {
    // 🔴 the dangerous half. `buffered` is the ONE verdict that tells a caller their text sits in
    // the box, where a re-send would append and wedge it. a wrapped message that counted 0 made
    // `buffered` unreachable, so the say fell to `absent` — whose advice is "verify, never
    // re-send blind", but which no longer names the box as the place the text is
    const state = computeCloneInputState({
      screen: asNarrowScreen([
        NARROW,
        '❯ switch back to opus via npx rhx clone',
        '  say with a model flag',
        NARROW,
      ]),
      message: MESSAGE,
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('dirty');
    expect(state.countInInput).toEqual(1);
  });

  test('a PARTIAL fragment in the box does NOT count — the collapse must not over-match', () => {
    // the bound on the cure, and the case a human mid-type produces: the box holds a PREFIX of
    // our message, never the whole of it. it must read `dirty` (there is human work to protect,
    // so the pre-check refuses) while the count stays 0 (the message did not land). a collapse
    // that normalized too far — or a match that fell back to a per-word scan — would forge a
    // rise here and report `buffered` for a message that was never written
    const state = computeCloneInputState({
      screen: asNarrowScreen([NARROW, '❯ switch back to opus via', NARROW]),
      message: MESSAGE,
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('dirty');
    expect(state.countInInput).toEqual(0);
    expect(state.countOnScreen).toEqual(0);
  });

  test('a partial in the box BESIDE a wrapped message in the queue → both reads hold at once', () => {
    // the combination the live run would hit next: a human is mid-type while our say landed in
    // the queue above. each read must answer on its own region — the count rises ON SCREEN and
    // stays 0 IN the box, and the region reads `dirty` off the human's fragment. a single
    // whole-screen count would conflate the two and report `buffered`, whose advice (do not
    // re-send) is right by luck and wrong in what it names
    const state = computeCloneInputState({
      screen: asNarrowScreen([
        '❯ switch back to opus via npx rhx clone',
        '  say with a model flag',
        NARROW,
        '❯ and then tell me wh',
        NARROW,
      ]),
      message: MESSAGE,
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('dirty');
    expect(state.countInInput).toEqual(0);
    expect(state.countOnScreen).toEqual(1);
  });
});

describe('computeCloneInputState', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const state = computeCloneInputState({
        screen: asScreen(thisCase.given.lines),
        message: thisCase.given.message,
      });
      // the case's own `queued` wins where it states one; else the empty-queue default applies
      expect(state).toEqual({ queued: false, ...thisCase.expect });
    }),
  );
});

describe('computeCloneInputState — a menu fenced by its own rules is a modal, never a dirty box', () => {
  // 🔴 the MEASURED geometry, verbatim from a live claude v2.1.87 (2026-09-17). the brain drew a
  // four-option "what next?" menu and fenced its OWN option list with a rule pair — so the box
  // locator (which takes the LAST rule pair) captured the MENU as the box, and the above-band
  // modal scan then excluded exactly the rows that hold the `❯ 1.` marker.
  //
  // the read that came back was `focus: input, input: dirty` — documented as FORCEABLE. so the
  // documented recovery (`re-send with --force`) would have written `\r` into a live option menu
  // and SELECTED option 1, a choice no human made. that is V3 / case=6 broken by a
  // misclassification, which is why this fixture is the real screen rather than a tidied one
  //
  // .note = the option labels are verbatim capture, gerund and all — a tidied fixture would
  //   measure a screen the brain never drew
  const MENU_FENCED_LINES = [
    '❯ reply with exactly: GHOST-TURN-1',
    '● GHOST-TURN-1',
    RULE,
    ' ☐ Next step',
    '',
    'Which would you like me to work on next in this worktree?',
    '',
    '❯ 1. Review the diff',
    '     Walk the staged/unstaged changes and report blockers,',
    '  2. Run the test tiers',
    '  3. Type something.',
    RULE,
    '  4. Chat about this',
    '',
    'Enter to select · ↑/↓ to navigate · Esc to cancel',
  ];

  test('a menu fenced by its own rule pair reads MODAL (no force path)', () => {
    // goes RED under the pre-cure classifier, which read `focus: input, input: dirty` — and a
    // dirty box is forceable, so the pre-cure read made `--force` an option-menu keystroke
    const state = computeCloneInputState({
      screen: asScreen(MENU_FENCED_LINES),
      message: 'SENTINEL-menu',
    });
    expect(state.focus).toEqual('modal');
  });

  test('the footer alone carries it — the `❯ 1.` row sits INSIDE the band', () => {
    // the mechanism, isolated: strip the footer and the SAME screen falls back to the band read,
    // which proves the above-band scan genuinely cannot see the menu. so the footer is not a
    // redundant second opinion here — it is the only detector that reaches this screen
    const noFooter = MENU_FENCED_LINES.filter(
      (line) => !line.includes('Enter to select'),
    );
    const state = computeCloneInputState({
      screen: asScreen(noFooter),
      message: 'SENTINEL-menu',
    });
    expect(state.focus).toEqual('input');
  });

  test('a normal box with a status footer stays INPUT — no false modal', () => {
    // the counter-clamp, and the one that matters most: a false `modal` has NO force path, so it
    // would make a healthy clone permanently deaf. this is the measured non-modal geometry from
    // the same capture — a one-row box, and a status line below the bottom rule
    const normal = [
      RULE,
      '❯ Try "edit invokeImagineStitcher.integration.test.ts to..."',
      RULE,
      "  🗿 5.3.verification, review…You've used 87% of your weekly limit · resets S…",
    ];
    const state = computeCloneInputState({
      screen: asScreen(normal),
      message: 'SENTINEL-normal',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('clear');
  });

  test('a navigate hint below the band also reads MODAL', () => {
    // the second footer marker, on its own. `Esc to cancel` is deliberately NOT a marker — a
    // cancel hint is plausible on a non-modal surface, and a false modal is the worse error
    const navOnly = [
      RULE,
      '❯ 1. first',
      '  2. second',
      RULE,
      '↑/↓ to navigate',
    ];
    const state = computeCloneInputState({
      screen: asScreen(navOnly),
      message: 'SENTINEL-nav',
    });
    expect(state.focus).toEqual('modal');
  });

  test('an `Esc to cancel` hint alone does NOT read modal', () => {
    // pins the deliberate omission, so a later editor who adds it must first answer why a
    // non-modal surface never shows it. a false modal has no force path — it is the worse error
    const escOnly = [RULE, '❯ Try "write a test"', RULE, '  Esc to cancel'];
    const state = computeCloneInputState({
      screen: asScreen(escOnly),
      message: 'SENTINEL-esc',
    });
    expect(state.focus).toEqual('input');
  });
});

describe('computeCloneInputState — a dim box is a brain ghost, a bright box is human work', () => {
  // 🔴 the class the placeholder whitelist was blind to. this text is NOT a `Try "…"` shape, so
  // no marker matches it — the dim read is the only detector that can reach `clear` here.
  //
  // measured 2026-09-17 against a live claude v2.1.87: a peer drew its own suggested next turn
  // into the box (`❯ now reply with exactly: …`) and then refused every say with
  // `input-region-dirty`, PERMANENTLY — a ghost never clears on its own, and the only recovery
  // was `--force`, which is documented to fuse with a human's uncommitted text. that a forced
  // turn carried ONLY the dispatched message is what proved the box was empty all along
  const GHOST_LINES = [
    '● prior turn output',
    RULE,
    '❯ now reply with exactly: RELAY-OK-2',
    RULE,
  ];

  test('a DIM box → clear, so a say proceeds (the permanently-deaf defect)', () => {
    const state = computeCloneInputState({
      screen: asScreenWithDim({ lines: GHOST_LINES, dim: [2] }),
      message: 'SENTINEL-ghost',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('clear');
  });

  test('the SAME text BRIGHT → dirty, so a say still refuses (case=2 holds)', () => {
    // the twin of the case above, one attribute apart. it proves the cure did not widen `clear`
    // to cover any box with text in it — a human's own typed work reads `dirty` exactly as before
    const state = computeCloneInputState({
      screen: asScreen(GHOST_LINES),
      message: 'SENTINEL-ghost',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('dirty');
  });

  test('a PARTLY dim box → dirty, because bright content outlives the blank', () => {
    // the strictest case: a human left half a sentence and the brain appended a dim tail. a
    // per-row `allDim` flag would read the human's row as work and the tail as ghost and could
    // disagree with itself; the bright-only STRING keeps the human's text and blanks the ghost,
    // so the join is non-empty and the box refuses — the human's work is never pasted over
    const mixed = [
      RULE,
      '❯ half a sentence a human left',
      '  and a ghost tail',
      RULE,
    ];
    const state = computeCloneInputState({
      screen: asScreenWithDim({ lines: mixed, dim: [2] }),
      message: 'SENTINEL-mixed',
    });
    expect(state.input).toEqual('dirty');
  });

  test('a dim box does NOT suppress the count — a queued message still rises', () => {
    // the count reads the FULL screen, never the bright-only one. a caller's own dispatched
    // message may render dim while it sits queued, and a count that lost it would report no rise
    // — a false `absent` for a message that landed, which is the R1 defect this wish exists to kill
    const queued = [RULE, '❯ SENTINEL-dimcount', RULE];
    const state = computeCloneInputState({
      screen: asScreenWithDim({ lines: queued, dim: [1] }),
      message: 'SENTINEL-dimcount',
    });
    expect(state.input).toEqual('clear');
    expect(state.countInInput).toEqual(1);
  });
});

// 🔴 the dim queue hint — the ONE screen signal that parts `enqueued` from `released`.
//
// measured 2026-09-18 against live claude v2.1.87, a peer mid-print of 1..2000: a submitted
// message raised its own transcript count within 678ms while it plainly sat in the queue. so the
// transcript proves SUBMIT, never release, and a transcript rise alone is satisfied by both states.
// that refutes vision premise A1, and without this hint `released` outranks `enqueued` on every
// busy dispatch — `enqueued` unreachable (R3 unmet), and `--await release` returns at a submit.
//
// the read is a PAIR: present in the full render AND absent from the bright-only one. the brain
// dims what IT drew, so the dim clause is what parts the brain's own hint from a human who typed
// the same words. the capture is
// `.agent/.cache/repo=rhachet/skill=clone-say/debug.2026-09-18.log`
describe('computeCloneInputState — the dim queue hint parts `enqueued` from `released`', () => {
  // the measured geometry, verbatim: the queued message above the band, the dim hint inside it
  const HINT_ROW = '❯ Press up to edit queued messages';
  const QUEUE_HELD_LINES = ['❯ A1-PROBE-SENTINEL-alpha', RULE, HINT_ROW, RULE];

  test('the hint renders DIM inside the box → queued true', () => {
    const state = computeCloneInputState({
      screen: asScreenWithDim({ lines: QUEUE_HELD_LINES, dim: [2] }),
      message: 'A1-PROBE-SENTINEL-alpha',
    });
    expect(state.queued).toEqual(true);
  });

  test('the box still reads CLEAR while the hint holds it — a say is not refused by the brain own ghost', () => {
    // the hint IS the box content, so a bright-only read of the band comes back empty and the
    // region reads `clear`. that matters: were it `dirty`, every busy peer would refuse a say
    // with `input-region-dirty` and a driver would go deaf exactly when the queue is useful
    const state = computeCloneInputState({
      screen: asScreenWithDim({ lines: QUEUE_HELD_LINES, dim: [2] }),
      message: 'A1-PROBE-SENTINEL-alpha',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('clear');
  });

  test('🔴 the SAME phrase BRIGHT → queued false, so a human cannot forge a held queue', () => {
    // the forgery guard, and the reason the read is a dim/bright pair rather than a phrase
    // whitelist. a human who types the marker renders it at default intensity, so it survives the
    // bright-only read and the hint is refused. were it honored, `--await release` would hold to
    // its full bound on a message the brain had already taken — a false `enqueued` on a release
    const state = computeCloneInputState({
      screen: asScreen(QUEUE_HELD_LINES),
      message: 'A1-PROBE-SENTINEL-alpha',
    });
    expect(state.queued).toEqual(false);
  });

  test('a FREE peer draws a bare `❯` on that row → queued false', () => {
    // the same read taken against an idle peer in the same capture. the hint is present exactly
    // while the queue is non-empty, so its absence is the empty-queue report
    const state = computeCloneInputState({
      screen: asScreenWithDim({
        lines: ['● prior turn output', RULE, '❯', RULE],
        dim: [2],
      }),
      message: 'never-on-screen',
    });
    expect(state.queued).toEqual(false);
  });

  test('the SINGULAR variant still reads queued — the marker is a prefix, never the full phrase', () => {
    // the plural is unmeasured at a queue depth of one, so a `queued message` singular must not
    // read as an empty queue. a full-phrase match would report `released` for the commonest
    // enqueued there is: the first message to join an idle queue
    const state = computeCloneInputState({
      screen: asScreenWithDim({
        lines: [RULE, '❯ Press up to edit queued message', RULE],
        dim: [1],
      }),
      message: 'never-on-screen',
    });
    expect(state.queued).toEqual(true);
  });

  test('a MODAL replaces the box → queued false, the safe report', () => {
    // the hint renders inside the box, so a modal that replaced the box leaves it unreadable.
    // `false` is fail-safe: it cannot forge an `enqueued` on a screen whose write channel already
    // refuses, since the pre-check reads `focus` before it reads aught else
    const state = computeCloneInputState({
      screen: asScreen(MODAL_LINES),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('modal');
    expect(state.queued).toEqual(false);
  });

  test('NO box band at all → queued false, same safe report', () => {
    const state = computeCloneInputState({
      screen: asScreen(['● just some output', '  no rendered fence']),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('unrecognized');
    expect(state.queued).toEqual(false);
  });
});

// r011-i006-n1: countOnScreen scans only the live viewport, never scrollback. a needle that
// scrolled into history must not count — else a probe-blind baseline (countOnScreen 0) versus a
// later capable read that finds a stale scrollback echo reads as a false rise, a misreport of
// enqueued/buffered for a message that never landed. the same fixture with a small `rows` (echo
// above the viewport) counts 0; with a large `rows` (echo inside the viewport) counts 1 — so the
// viewport boundary, never the full buffer, decides the count. the clamp bites at that boundary
const asScreenWithRows = (lines: string[], rows: number): CloneScreenLive => ({
  live: true,
  lines,
  linesBright: lines,
  cursorX: 0,
  cursorY: 0,
  cols: 120,
  rows,
});

// 🔴 the F11 over-match clamp — a modal is detected STRUCTURALLY (a consecutive-option run), never
// by a phrase whitelist. do not reintroduce one.
//
// a phrase whitelist cannot discriminate a menu from a turn, and the measurement proves it: a
// SUBMITTED USER TURN carries the `❯` glyph in the content region above the band (captured from a
// live claude v2.1.87, `5.1.execution.research.screens.captured.md:79`). so `❯ \d+\. ` matches a
// turn, and the prose markers `Do you want to` / `to confirm` match any ordinary assistant reply.
//
// the harm a false `modal` ships is unbounded, which is why the whitelist is forbidden rather than
// merely discouraged: `modal-holds-focus` has NO `--force` path, so a false read makes a healthy
// clone permanently deaf to `say` until the matched row scrolls off the viewport.
//
// the safety direction holds: a real option menu is a LIST, so it carries a consecutive run, and
// the measured modal geometry also carries a below-band footer. both still refuse.
describe('computeCloneInputState — a turn that READS like a menu is not a modal (F11, repaired)', () => {
  test('a submitted turn `❯ 1. …` above a clean box reads `input` — a turn is not a list', () => {
    // rows 40 → viewportStart 0, so the turn at index 0 is in the LIVE viewport (never scrollback)
    // and ABOVE the box top rule, so the box-band exclusion does not reach it. the phrase
    // whitelist read this as `modal`; the run detector does not — the turn is followed by the
    // brain's reply, never by its own `  2.` continuation row
    const state = computeCloneInputState({
      screen: asScreen([
        '❯ 1. buy the milk and eggs',
        '● sure, here is your list',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('clear');
  });

  test('a reply that carries "Do you want to" above a clean box reads `input` — prose is not a menu', () => {
    const state = computeCloneInputState({
      screen: asScreen([
        '● Do you want to see the full diff?',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('clear');
  });

  test('a reply that carries "to confirm" above a clean box reads `input`', () => {
    const state = computeCloneInputState({
      screen: asScreen([
        '● run the suite to confirm the fix holds',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('input');
  });

  test('a submitted turn `❯ Yes, …` above a clean box reads `input`', () => {
    const state = computeCloneInputState({
      screen: asScreen([
        '❯ Yes, go ahead and land it',
        '● landed',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('input');
  });

  // 🔴 the SAFETY half — the narrow cut must not open case=6. a real option menu above the band
  // is a consecutively-numbered RUN, so it still reads `modal`, which has NO force path (V3)
  test('[safety] a real option RUN above the box still reads `modal` — the net is kept', () => {
    const state = computeCloneInputState({
      screen: asScreen([
        '❯ 1. Review the diff',
        '  2. Run the test tiers',
        '  3. Chat about this',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('modal');
  });

  test('[safety] a numbered run whose numbers do NOT ascend is not a menu', () => {
    // a turn that lists `1.` then `1.` again is prose, not a selection list — the detector keys
    // on the ascent, so it cannot be satisfied by an arbitrary numbered paragraph
    const state = computeCloneInputState({
      screen: asScreen([
        '❯ 1. buy milk',
        '  1. buy milk again',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('input');
  });

  // 🔴 the MEASURED residual, now closed. `computeCloneInputState`'s own `.note` predicted this
  // and deferred it to a dream; the realbrain probe then measured it FIRE against an ordinary
  // reply (`clone.modalprobe.realbrain.acceptance.test.ts`, 2026-09-18): a live claude asked for
  // "a numbered list of three fruits" answered with one, and the very next `say` came back
  // `withheld` / `modal-holds-focus` — exit 2, and `modal` has NO force path, so the peer was
  // deaf until the reply scrolled off the viewport.
  //
  // the discriminator is the SELECTION GLYPH, and it is structural rather than a phrase: a menu
  // marks its selected row with `❯` (that is what `OPTION_ROW`'s optional `❯` is for — the peers
  // are bare-indented). an assistant's numbered PROSE carries the glyph on no row at all. so a
  // run that ascends with no `❯` anywhere in it is a list the brain wrote, never a choice it awaits.
  //
  // the safety direction is preserved TWICE over: a real option menu carries the glyph on its
  // selected row (every captured geometry does), AND a real interactive menu must tell the human
  // how to operate it, so `MODAL_FOOTER_MARKERS` catches it independently of this net.
  test('an assistant numbered-list REPLY above a clean box reads `input` — a list is not a choice', () => {
    const state = computeCloneInputState({
      screen: asScreen([
        '● Here are three fruits:',
        '  1. apple',
        '  2. banana',
        '  3. cherry',
        '● RHACHET-MODAL-OK 7e8fa87d',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('clear');
  });

  test('[safety] the SAME run with a `❯` on one row still reads `modal` — the glyph is the cut', () => {
    // the counter-clamp that proves the discriminator is the glyph and not the prose around it:
    // one character added to the fixture above flips the verdict back to a refusal
    const state = computeCloneInputState({
      screen: asScreen([
        '● Here are three fruits:',
        '❯ 1. apple',
        '  2. banana',
        '  3. cherry',
        RULE,
        '❯ Try "write a test for <filepath>"',
        RULE,
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('modal');
  });

  test('[safety] a glyphless run that draws a menu FOOTER still reads `modal` — the second net', () => {
    // the independent net: even where the selection glyph is absent from every option row, a real
    // interactive menu advertises its own controls below the band, and that catches it
    const state = computeCloneInputState({
      screen: asScreen([
        '  1. Review the diff',
        '  2. Run the test tiers',
        RULE,
        '❯',
        RULE,
        'Enter to select · ↑/↓ to navigate',
      ]),
      message: 'never-on-screen',
    });
    expect(state.focus).toEqual('modal');
  });
});

describe('computeCloneInputState — countOnScreen viewport scope (r011-i006-n1)', () => {
  // a prior submitted turn (the stale echo) at the head, then an idle box at the foot. the box
  // holds only the placeholder, so the needle appears ONLY in the scrolled-up turn
  const LINES = [
    '❯ STALE-ok-7',
    '● a reply output line',
    RULE,
    '❯ Try "write a test for <filepath>"',
    RULE,
  ];

  test('the stale echo scrolled ABOVE the viewport is NOT counted (countOnScreen 0)', () => {
    // rows 4 → viewportStart 1, so the head echo at index 0 sits in scrollback, excluded
    const state = computeCloneInputState({
      screen: asScreenWithRows(LINES, 4),
      message: 'STALE-ok-7',
    });
    expect(state).toEqual({
      focus: 'input',
      input: 'clear',
      countInInput: 0,
      countOnScreen: 0,
      // the placeholder box draws no queue hint, so the queue reads empty at both geometries
      queued: false,
    });
  });

  test('the same echo INSIDE the viewport IS counted (countOnScreen 1)', () => {
    // rows 40 → viewportStart 0, so the head echo is inside the viewport and counts. this is the
    // control: it proves the zero above is the viewport boundary at work, not an absent needle
    const state = computeCloneInputState({
      screen: asScreenWithRows(LINES, 40),
      message: 'STALE-ok-7',
    });
    expect(state).toEqual({
      focus: 'input',
      input: 'clear',
      countInInput: 0,
      countOnScreen: 1,
      queued: false,
    });
  });
});

describe('computeCloneInputState — any bright box content refuses, whoever wrote it', () => {
  // the box is a REGION of a shared terminal, so two different authors can leave bright glyphs in
  // it, and the read cannot tell them apart. both rows below report `dirty`, and only one of them
  // is a human.
  //
  // 🔴 the cursor does NOT sort them. measured 2026-09-21 against @:c7a99551, the box unmoved
  // between the two probes (rules at rows 51 and 53, `❯ party` at 52):
  //
  //   caret at the END of `party`    → cursor=(x:7,y:52)   inside the band
  //   caret at the START of `party`  → cursor=(x:0,y:56)    THREE rows BELOW the band
  //
  // ⇒ the terminal cursor does not track the brain-cli line editor's caret, so a truncate-at-cursor
  // read is not merely imprecise — at (x:0,y:52) it would have read the box CLEAR and pasted over
  // real uncommitted work. the over-refusal below is the safe direction, and it stands.

  test('🔴 the MEASURED human mid-type → dirty', () => {
    // the shape the wisher left: they typed `party` into the box, and a say returned
    // `withheld` / `input-region-dirty`, exit 2, with `delivered: false` — no byte reached the pty,
    // so their text survived untouched and a retry cannot duplicate
    const state = computeCloneInputState({
      screen: asScreen(['✶ a turn in flight', RULE, '❯ party', RULE]),
      message: 'PARTY-PROBE-1',
    });
    expect(state.focus).toEqual('input');
    expect(state.input).toEqual('dirty');
  });

  test('🟡 foreign stdout in the box ALSO reads dirty — a known over-refusal', () => {
    // measured 2026-09-20 against live peer @:wrap2: a hook of the clone's own spawned a shell whose
    // node shim printed a version banner, and the bytes landed inside the box at default intensity,
    // over the dim queue hint (a torn `…eued messages` tail survived beside it). the say that
    // followed refused for a human who was never there.
    //
    // the window closes on the brain's next box redraw — the same peer reported `enqueued` minutes
    // later — so the refusal is TRANSIENT. within it, `--force` is the only path through.
    const state = computeCloneInputState({
      screen: asScreen([
        '● prior turn output',
        RULE,
        '❯ node v22.21.0eued messages',
        RULE,
      ]),
      message: 'SENTINEL-foreign',
    });
    expect(state.input).toEqual('dirty');
  });
});
