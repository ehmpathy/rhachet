import { given, then, when } from 'test-fns';

import { asPtySnapshotSafe } from './invokeRhachetCliBinary';

/**
 * .what = the pty snapshot scrubber must strip the pty's end-of-line pad without it
 *         also eating the blank lines a command deliberately emits
 * .why = every pty-captured snapshot in this repo (`keyrack.fill`,
 *        `keyrack.githubApp.discovery`) passes through this one helper, so a scrub
 *        that over-matches silently reshapes what a reviewer sees in a pr diff — and
 *        reshapes it AWAY from what a human at a terminal actually gets
 *
 * ⚠️ .the defect this file exists to clamp: the scrub was `/\s+$/gm`, and `\s`
 *    matches `\n`. so a run of newlines at an end-of-line boundary matched as one
 *    blob and collapsed, which erased EVERY blank line a command emitted between its
 *    sections. `fillKeyrackKeys.ts:211` emits one before each `🔑 key N/M` header,
 *    and not one of them reached the snapshot — so the snapshot showed a cramped
 *    wall of keys that no human has ever seen
 *
 * .note = the intent was never in doubt; the helper's own comment says
 *         "eol ws → the pty pads to the terminal width". a pad is spaces and tabs.
 *         `[ \t]` says exactly that, and cannot reach a newline
 */
describe('asPtySnapshotSafe', () => {
  given('[case1] a pty capture that pads lines out to the terminal width', () => {
    when('[t0] the pad sits at end of line', () => {
      then('the spaces are stripped', () => {
        expect(asPtySnapshotSafe('🔐 head   \n   └─ leaf     ')).toEqual(
          '🔐 head\n   └─ leaf',
        );
      });

      then('a tab pad is stripped too', () => {
        expect(asPtySnapshotSafe('🔐 head\t\t\n   └─ leaf\t')).toEqual(
          '🔐 head\n   └─ leaf',
        );
      });
    });
  });

  /**
   * THE clamp. it goes red under the `/\s+$/gm` this replaced, which matched the
   * `\n\n` as one blob and returned a single newline — the two key blocks fused.
   *
   * .note = the fixture is the real shape of `keyrack fill`'s output, not a
   *         synthetic one: a key block, a blank separator, the next key header
   */
  given('[case2] a command that emits a blank line between its sections', () => {
    const captured =
      '🔐 keyrack fill (env: test, keys: 2, owners: 1)\n' +
      '\n' +
      '🔑 key 1/2, PLAIN_KEY, for 1 owner\n' +
      '   └─ for owner default\n' +
      '\n' +
      '🔑 key 2/2, MULTI_REACH_KEY, for 1 owner\n' +
      '   └─ for owner default\n';

    when('[t0] the capture is scrubbed for a snapshot', () => {
      const result = asPtySnapshotSafe(captured);

      then('the separators survive — a human sees them, so a reviewer must too', () => {
        expect(result).toEqual(
          '🔐 keyrack fill (env: test, keys: 2, owners: 1)\n' +
            '\n' +
            '🔑 key 1/2, PLAIN_KEY, for 1 owner\n' +
            '   └─ for owner default\n' +
            '\n' +
            '🔑 key 2/2, MULTI_REACH_KEY, for 1 owner\n' +
            '   └─ for owner default',
        );
      });

      // .note = asserted on its own, because the equality above would also hold if the
      //         helper collapsed BOTH separators the same wrong way. this names the
      //         exact byte pair a fused render loses
      then('a key header is never fused onto the line above it', () => {
        expect(result).toContain('default\n\n🔑 key 2/2');
      });
    });
  });

  /**
   * the two strips must compose: a pty pads the line AND the command emitted a blank
   * after it, so a real capture carries both at once. a helper that handled each
   * alone but not together would pass the two cases above and still mangle every
   * real snapshot
   */
  given('[case3] a pad and a deliberate blank line, together', () => {
    when('[t0] a padded line is followed by a blank separator', () => {
      then('the pad goes and the separator stays', () => {
        expect(asPtySnapshotSafe('🔐 a   \n\n🔑 b   \n')).toEqual('🔐 a\n\n🔑 b');
      });
    });
  });

  given('[case4] the outer edges of a capture', () => {
    when('[t0] the capture opens and closes with blank lines', () => {
      then('they are trimmed — an edge blank is pty noise, not a separator', () => {
        expect(asPtySnapshotSafe('\n\n🔐 head\n\n')).toEqual('🔐 head');
      });
    });
  });
});
