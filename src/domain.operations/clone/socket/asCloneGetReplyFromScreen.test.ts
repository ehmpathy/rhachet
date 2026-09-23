import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import { asCloneGetReplyFromScreen } from './asCloneGetReplyFromScreen';

const RULE = '─'.repeat(80);

describe('asCloneGetReplyFromScreen', () => {
  it('a screen that is not live degrades to feed-not-live (V7, never a false absent)', () => {
    const reply = asCloneGetReplyFromScreen({
      screen: { live: false, reason: 'feed-not-live' },
      needle: 'poke',
    });
    expect(reply.probe).toEqual('unsupported');
    if (reply.probe !== 'unsupported')
      throw new Error('expected an unsupported reply');
    expect(reply.reason).toEqual('feed-not-live');
  });

  it('a live screen carries a classified capable state', () => {
    const liveScreen: CloneScreenRead = {
      live: true,
      lines: ['● prior turn', RULE, '❯ SENTINEL-fromscreen', RULE],
      // every row BRIGHT — the strictest fixture: the box content counts as human work, so the
      // classifier must reach its verdict on the text itself rather than on a dim ghost
      linesBright: ['● prior turn', RULE, '❯ SENTINEL-fromscreen', RULE],
      cursorX: 0,
      cursorY: 0,
      cols: 80,
      rows: 40,
    };
    const reply = asCloneGetReplyFromScreen({
      screen: liveScreen,
      needle: 'SENTINEL-fromscreen',
    });
    expect(reply.probe).toEqual('capable');
    if (reply.probe !== 'capable') throw new Error('expected a capable reply');
    expect(reply.state.focus).toEqual('input');
    expect(reply.state.countInInput).toEqual(1);
  });

  it('no grid rides the reply unless debug is opted into (the F02/F03 default)', () => {
    const reply = asCloneGetReplyFromScreen({
      screen: {
        live: true,
        lines: [RULE, '❯ ', RULE],
        linesBright: [RULE, '❯ ', RULE],
        cursorX: 0,
        cursorY: 0,
        cols: 80,
        rows: 40,
      },
      needle: 'poke',
    });
    if (reply.probe !== 'capable') throw new Error('expected a capable reply');
    expect(reply.grid).toBeUndefined();
  });

  // ⚠️ the clamp on the debug grid: the emulator keeps `scrollback: 1000`, and
  // `computeCloneInputState` reads ONLY `lines.slice(lines.length - rows)`. an unclamped
  // grid would therefore ship ~1000 rows on every probe cycle AND show a reader who
  // diagnoses a verdict rows the classifier provably skipped. this pins the drop at the boundary
  it('a debug grid carries the LIVE VIEWPORT only — scrollback is dropped', () => {
    const rows = 5;
    const scrollback = [
      'scrolled-away-A',
      'scrolled-away-B',
      'scrolled-away-C',
    ];
    const viewport = ['● a turn', RULE, '❯ SENTINEL-clamp', RULE, ''];
    const reply = asCloneGetReplyFromScreen({
      screen: {
        live: true,
        lines: [...scrollback, ...viewport],
        linesBright: [...scrollback, ...viewport],
        cursorX: 2,
        cursorY: 2,
        cols: 80,
        rows,
      },
      needle: 'SENTINEL-clamp',
      debug: true,
    });
    if (reply.probe !== 'capable') throw new Error('expected a capable reply');
    if (reply.grid === undefined) throw new Error('expected a grid');
    expect(reply.grid.lines).toEqual(viewport);
    expect(reply.grid.lines).toHaveLength(rows);
    // the geometry survives the clamp — a band read depends on it
    expect(reply.grid.cols).toEqual(80);
    expect(reply.grid.rows).toEqual(rows);
    expect(reply.grid.cursorX).toEqual(2);
  });

  it('a grid SHORTER than rows (a young feed) is carried whole, never wrapped', () => {
    const lines = [RULE, '❯ ', RULE];
    const reply = asCloneGetReplyFromScreen({
      screen: {
        live: true,
        lines,
        linesBright: lines,
        cursorX: 0,
        cursorY: 0,
        cols: 80,
        rows: 40,
      },
      needle: 'poke',
      debug: true,
    });
    if (reply.probe !== 'capable') throw new Error('expected a capable reply');
    expect(reply.grid?.lines).toEqual(lines);
  });

  // 🔴 the clamp the extant viewport test could not make: its two grids were byte-identical,
  // so a clamp applied to `lines` alone still satisfied it. here the bright grid DIFFERS (a dim
  // box row blanks), which is the only shape that can catch a one-sided slice.
  //
  // both grids are one screen read at two intensities, and every consumer treats them as
  // index-aligned — the classifier slices one row window across both, and the debug renderer
  // prints them side by side so a reader compares row N to row N. clamp only `lines` and the
  // pair desynchronizes by the scrollback depth, so the diagnosis reads a screen that never was
  it('the debug grid clamps linesBright by the SAME window — the pair stays index-aligned', () => {
    const rows = 4;
    const scrollback = ['scrolled-A', 'scrolled-B', 'scrolled-C'];
    const viewport = ['● a turn', RULE, '❯ a dim ghost', RULE];
    const viewportBright = ['● a turn', RULE, '', RULE];
    const reply = asCloneGetReplyFromScreen({
      screen: {
        live: true,
        lines: [...scrollback, ...viewport],
        linesBright: [...scrollback, ...viewportBright],
        cursorX: 2,
        cursorY: 2,
        cols: 80,
        rows,
      },
      needle: 'SENTINEL-align',
      debug: true,
    });
    if (reply.probe !== 'capable') throw new Error('expected a capable reply');
    if (reply.grid === undefined) throw new Error('expected a grid');
    expect(reply.grid.lines).toEqual(viewport);
    // goes RED under the pre-cure clamp, which handed back the FULL bright buffer here
    expect(reply.grid.linesBright).toEqual(viewportBright);
    expect(reply.grid.linesBright).toHaveLength(rows);
    // the alignment itself, stated as the property a consumer relies on
    expect(reply.grid.linesBright).toHaveLength(reply.grid.lines.length);
  });
});
