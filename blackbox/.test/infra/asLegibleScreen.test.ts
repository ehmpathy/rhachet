import { given, then, when } from 'test-fns';

import { asLegibleScreen } from './asLegibleScreen';

/**
 * .what = the clamp on the pty-screen stripper that feeds both clone failure dumps
 * .why = a failure dump is the ONE artifact a diagnostician reads when a real-brain journey
 *   breaks. if the stripper over-reaches it destroys the evidence; if it under-reaches the
 *   dump stays the escape soup it was. both halves are pinned here
 *
 * .note = `[case3]` carries a REAL buffer, copied from a `[t6]` dispatch failure. a
 *   hand-built fixture proves the regex matches itself; only real bytes prove it matches
 *   what a pty actually emits
 */
describe('asLegibleScreen', () => {
  given('[case1] a buffer with color escapes alone', () => {
    const screen = '\x1B[31mred\x1B[39m and \x1B[93myellow\x1B[39m';

    when('[t0] it is stripped', () => {
      then('the color bytes are gone and the words survive', () => {
        expect(asLegibleScreen(screen)).toEqual('red and yellow');
      });
    });
  });

  given('[case2] a buffer with CURSOR MOTION and no color at all', () => {
    // 🔴 the case a colorless brain-cli would NOT fix. `NO_COLOR` silences SGR only;
    //   these are the motion codes a tui repaints with, and they share the CSI shape
    const screen = '\x1B[33Bplain text\x1B[40;1H\x1B[38;3H\x1B[H';

    when('[t0] it is stripped', () => {
      then('the motion bytes are gone', () => {
        expect(asLegibleScreen(screen)).toEqual('plain text');
      });

      then('no escape byte survives', () => {
        expect(asLegibleScreen(screen)).not.toContain('\x1B');
      });
    });
  });

  given('[case3] a REAL pty buffer from a [t6] dispatch failure', () => {
    const screen = [
      '\x1B[33B\x1B[31m✶\x1B[13G\x1B[37m(0s)\x1B[39m\x1B[40;1H\x1B[38;3H\x1B[H\r',
      '\x1B[33B\x1B[31m✻\x1B[39m\x1B[40;1H\x1B[38;3H\x1B[H\r',
      '\x1B[33B\x1B[31m✽\x1B[14G\x1B[37m1\x1B[39m\x1B[40;1H\x1B[38;3H\x1B[H\r',
      '\x1B[27B\x1B[97m●\x1B[3G\x1B[39msntlxhead1be5dc9743\r',
      '\x1B[2C\x1B[28Bsntlxnew1be5dc9743\x1B[40;1H',
    ].join('');

    when('[t0] it is stripped', () => {
      const legible = asLegibleScreen(screen);

      then('the sentinels a diagnostician reads all survive', () => {
        expect(legible).toContain('sntlxhead1be5dc9743');
        expect(legible).toContain('sntlxnew1be5dc9743');
      });

      then('no escape byte survives', () => {
        expect(legible).not.toContain('\x1B');
      });

      then('it is a fraction of the raw length, so a 4000-char slice carries real text', () => {
        // the claim the stripper exists to make: the same slice budget buys far more
        // signal once the mechanics are gone
        expect(legible.length).toBeLessThan(screen.length / 2);
      });
    });
  });

  given('[case4] a spinner that repaints one identical line many times', () => {
    const screen = ['tick', 'tick', 'tick', 'tick', 'done'].join('\r');

    when('[t0] it is stripped', () => {
      then('the repeats collapse to one, and the last line survives', () => {
        expect(asLegibleScreen(screen)).toEqual('tick\ndone');
      });
    });
  });

  given('[case5] a buffer that carries the volatile values a dump needs as evidence', () => {
    // 🔴 the anti-`asSnapshotSafe` clamp. that masker exists to make a render
    //   deterministic, so it redacts exactly these. a DUMP must not — a masked temp
    //   path is a lead destroyed
    const screen =
      '\x1B[31mEACCES\x1B[39m at /tmp/test-fns/repo/.temp/2026-09-25T05-12-17.192Z.x.ab9f376a';

    when('[t0] it is stripped', () => {
      const legible = asLegibleScreen(screen);

      then('the temp path survives unmasked', () => {
        expect(legible).toContain(
          '/tmp/test-fns/repo/.temp/2026-09-25T05-12-17.192Z.x.ab9f376a',
        );
      });

      then('the stamp inside it survives too', () => {
        expect(legible).toContain('2026-09-25T05-12-17.192Z');
      });
    });
  });
});
