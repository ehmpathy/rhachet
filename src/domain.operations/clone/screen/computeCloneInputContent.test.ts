import { computeCloneInputContent } from './computeCloneInputContent';
import { computeCloneInputState } from './computeCloneInputState';
import type { CloneScreenLive } from './genCloneScreenFeed';

const RULE = '─'.repeat(120);

/**
 * .what = a live screen where the rows named by `dim` render DIM
 * .why = the queue read is gated on `state.queued`, which is read DIM-ONLY (the brain dims its
 *   own `Press up to edit queued messages` hint). so a fixture that models the queue at all must
 *   model the dim attribute — an all-bright fixture reads `queued: false` and the gate closes
 */
const asScreen = (input: {
  lines: string[];
  dim?: number[];
}): CloneScreenLive => ({
  live: true,
  lines: input.lines,
  linesBright: input.lines.map((line, index) =>
    (input.dim ?? []).includes(index) ? '' : line,
  ),
  cursorX: 0,
  cursorY: 0,
  cols: 120,
  rows: 40,
});

/**
 * .what = the content read off a screen, through the SAME state the classifier computed
 * .why = `computeCloneInputContent` takes the state rather than recompute it (`queued` has one
 *   owner), so every case here drives the real pair — never a hand-built state that could
 *   assert a gate the classifier would have closed
 */
const readContent = (input: { screen: CloneScreenLive; message?: string }) =>
  computeCloneInputContent({
    screen: input.screen,
    state: computeCloneInputState({
      screen: input.screen,
      message: input.message ?? '',
    }),
  });

describe('computeCloneInputContent — the buffer surface', () => {
  test('a human mid-type → the box rows, chrome stripped', () => {
    const content = readContent({
      screen: asScreen({
        lines: ['● prior turn output', RULE, '❯ party', RULE, '🗿 footer'],
      }),
    });
    expect(content.buffer).toEqual(['party']);
  });

  test('a MULTI-ROW entry → every row, in order', () => {
    // the box is a REGION: an interior newline lands as a real row (`❯ line1` / `  line2`), and a
    // read that showed only the `❯` row would show a human half their own text
    const content = readContent({
      screen: asScreen({
        lines: [
          '● prior turn output',
          RULE,
          '❯ first line',
          '  second line',
          '  third line',
          RULE,
        ],
      }),
    });
    expect(content.buffer).toEqual(['first line', 'second line', 'third line']);
  });

  test('the blank rows a short entry leaves at the band foot → dropped', () => {
    // the band is `rows`-tall whatever the entry's length, so an unfiltered read reports one
    // line of text and three empties — a render a human reads as "did it lose my text?"
    const content = readContent({
      screen: asScreen({
        lines: ['● out', RULE, '❯ party', '', '   ', RULE],
      }),
    });
    expect(content.buffer).toEqual(['party']);
  });

  test('an all-dim placeholder box → the row is still rendered', () => {
    // 🟡 the content read is deliberately NOT gated on `dirty`. a human who asks what is in the
    // box wants what is rendered there, and the brain's own ghost text is part of that answer —
    // the CLASSIFICATION already told them it counts as clear, so a suppressed row would answer
    // a different question than the one asked
    const screen = asScreen({
      lines: ['● out', RULE, '❯ Try "write a test"', RULE],
      dim: [2],
    });
    expect(computeCloneInputState({ screen, message: '' }).input).toEqual(
      'clear',
    );
    expect(readContent({ screen }).buffer).toEqual(['Try "write a test"']);
  });

  test('🔴 a screen with no band → empty, never a wider slice', () => {
    // a read that cannot locate the box must say so by reporting zero rows. to fall back to a
    // wider slice would hand a caller turn output labeled as their own input (rule.forbid.failhide)
    const content = readContent({
      screen: asScreen({ lines: ['● just output', 'no rules here'] }),
    });
    expect(content.buffer).toEqual([]);
    expect(content.queue).toEqual([]);
  });
});

describe('computeCloneInputContent — the queue surface', () => {
  // the MEASURED queue screen, 2026-09-18, live claude v2.1.87 (debug.2026-09-18.log rows 16-21):
  // the queued message renders `❯ <text>` ABOVE the band's top rule, bounded above by a blank
  // row; the dim hint sits INSIDE the box
  const QUEUE_LINES = [
    '  79',
    '  80',
    '',
    '  ❯ A1-PROBE-SENTINEL-alpha',
    RULE,
    '❯ Press up to edit queued messages',
    RULE,
    '  🗿 footer',
  ];

  test('a non-empty queue → the rows above the band', () => {
    const screen = asScreen({ lines: QUEUE_LINES, dim: [5] });
    expect(computeCloneInputState({ screen, message: '' }).queued).toEqual(
      true,
    );
    expect(readContent({ screen }).queue).toEqual(['A1-PROBE-SENTINEL-alpha']);
  });

  test('🔴 an EMPTY queue → empty, whatever sits above the band', () => {
    // the gate is the whole safety of this surface. the rows above the band hold a queued
    // message and a RELEASED turn alike (measured — neither position nor intensity parts them),
    // so without the gate a released turn would render under a `queue` header and a caller would
    // re-send a message the brain had already taken
    const screen = asScreen({
      lines: [
        '  80',
        '',
        '  ❯ A-TURN-ALREADY-RELEASED',
        RULE,
        '❯ Try "write a test"',
        RULE,
      ],
      dim: [4],
    });
    expect(computeCloneInputState({ screen, message: '' }).queued).toEqual(
      false,
    );
    expect(readContent({ screen }).queue).toEqual([]);
  });

  test('the walk stops at the first blank row above the band', () => {
    // the blank row is the measured separator between the queue and the turn output above it. a
    // walk that ran past it would report prior turn output as queued input
    const screen = asScreen({
      lines: [
        '  ● prior turn output nobody queued',
        '',
        '  ❯ QUEUED-one',
        '  ❯ QUEUED-two',
        RULE,
        '❯ Press up to edit queued messages',
        RULE,
      ],
      dim: [5],
    });
    expect(readContent({ screen }).queue).toEqual(['QUEUED-one', 'QUEUED-two']);
  });

  test('🔴 the walk stops at a RULE too, never only at a blank row', () => {
    // measured against the stub's `busy` screen, which renders the queued turn directly above the
    // band's top rule with NO blank row between it and the rule that closes the prior box. a walk
    // that stopped only at a blank row ran up through that rule and captured the prior box's
    // placeholder as a queued message — a row the caller would then be told the brain holds
    const screen = asScreen({
      lines: [
        RULE,
        '❯ Try "a message"', // the PRIOR box — must never read as queued
        RULE, // ← the boundary the walk must respect
        '❯ QUEUED-only-this',
        RULE,
        '❯ Press up to edit queued messages',
        RULE,
      ],
      dim: [5],
    });
    expect(readContent({ screen }).queue).toEqual(['QUEUED-only-this']);
  });

  test('a bare `❯` above the band → dropped, never reported as a held message', () => {
    // a row that strips to empty is chrome. to report it would show a caller a blank entry under
    // a `queue` header and have them wonder what the brain lost
    const screen = asScreen({
      lines: [
        '',
        '  ❯ QUEUED-real',
        '  ❯ ',
        RULE,
        '❯ Press up to edit queued messages',
        RULE,
      ],
      dim: [4],
    });
    expect(readContent({ screen }).queue).toEqual(['QUEUED-real']);
  });

  test('a queue read also carries its buffer, so one probe answers both', () => {
    const screen = asScreen({ lines: QUEUE_LINES, dim: [5] });
    const content = readContent({ screen });
    expect(content.queue).toEqual(['A1-PROBE-SENTINEL-alpha']);
    expect(content.buffer).toEqual(['Press up to edit queued messages']);
  });
});
