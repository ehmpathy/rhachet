import { given, then, when } from 'test-fns';

import { asSnapshotSafe } from './invokeRhachetCliBinary';

/**
 * .what = unit clamp for the path mask inside `asSnapshotSafe`
 *
 * 🚨 .why this file exists at all = `asSnapshotSafe` mediates EVERY blackbox snapshot in
 *   the repo, and it was the one masker in this directory with no clamp — its two siblings
 *   (`asPtySnapshotSafe`, `maskKeyrackGrantVolatiles`) each have one. so a defect in it
 *   moves every acceptance snapshot at once, and no row went red.
 *
 * ⚠️ the subject is the mask's TAIL CLASS — where it decides a path ENDS. that is the whole
 *   contract: a mask that under-consumes leaks a machine-specific path into a snapshot and
 *   the suite flakes per checkout; a mask that OVER-consumes eats the delimiter that proved
 *   the value closed, and the snapshot renders malformed output the producer never emitted.
 *   the second failure is the quiet one — it looks like a defect in the code under test.
 */
describe('asSnapshotSafe path mask', () => {
  given('[case1] a path that ends the way a STACK FRAME ends', () => {
    when('[t0] the frame is masked', () => {
      then('the closing paren survives, so the frame still reads as a frame', () => {
        expect(
          asSnapshotSafe('    at genClone (/home/vlad/git/rhachet/src/x.ts:12:5)'),
        ).toEqual('    at genClone (/PATH_STRIPPED)');
      });

      then('a /Users frame masks the same way', () => {
        expect(
          asSnapshotSafe('    at genClone (/Users/vlad/git/rhachet/src/x.ts:12:5)'),
        ).toEqual('    at genClone (/PATH_STRIPPED)');
      });

      then('a ci runner-work frame masks the same way', () => {
        expect(
          asSnapshotSafe('    at genClone (/runner/work/rhachet/src/x.ts:12:5)'),
        ).toEqual('    at genClone (/PATH_STRIPPED)');
      });
    });
  });

  given('[case2] a path that ends the way PROSE ends', () => {
    when('[t0] the sentence is masked', () => {
      then('the words after the path survive, so the fix still reads', () => {
        expect(
          asSnapshotSafe(
            'the rhx you just ran loaded from /home/vlad/.local/bin/rhx — compare that',
          ),
        ).toEqual('the rhx you just ran loaded from /PATH_STRIPPED — compare that');
      });
    });
  });

  // 🚨 THE CLAMP for the defect this file was written for. the mask's docblock read
  //   *"strip absolute file paths in stack traces"*, and `)` + whitespace ARE the complete
  //   terminator set for a stack trace. then a path arrived as a whole metadata VALUE,
  //   whose terminator is a quote, and the mask consumed `rhx",` — so the acceptance
  //   snapshot pinned `"rhachetRealpath": "/PATH_STRIPPED` with no closing quote and no
  //   comma, inside a block a reader scans as json.
  //
  //   dogfooded by a revert of the implementation: every row below goes RED with `"`
  //   removed from the tail class, and green with it present.
  given('[case3] a path that ends the way a JSON VALUE ends', () => {
    when('[t0] the path is the LAST key in the block', () => {
      const masked = asSnapshotSafe(
        ['{', '  "rhachetRealpath": "/home/vlad/.local/bin/rhx"', '}'].join('\n'),
      );

      then('the closing quote survives', () => {
        expect(masked).toEqual(
          ['{', '  "rhachetRealpath": "/PATH_STRIPPED"', '}'].join('\n'),
        );
      });

      then('the block still parses, so no reader can mistake it for a producer defect', () => {
        // asserted as a real parse rather than a string compare. a snapshot of malformed
        // json reads as a defect in the code under test, which is the whole harm here
        expect(JSON.parse(masked)).toEqual({ rhachetRealpath: '/PATH_STRIPPED' });
      });
    });

    when('[t1] the path key is followed by ANOTHER key', () => {
      const masked = asSnapshotSafe(
        [
          '{',
          '  "rhachetRealpath": "/home/vlad/.local/bin/rhx",',
          '  "hostTuple": "linux-x64"',
          '}',
        ].join('\n'),
      );

      then('the trailing comma survives', () => {
        expect(masked).toContain('"/PATH_STRIPPED",');
      });

      then('the following key survives — an over-consume would erase it', () => {
        // the property that makes this more than cosmetic. the tail class ran to the end
        // of the line, so anything sharing the line with the path was deleted from the
        // snapshot with no row to notice (`rule.forbid.failhide`)
        expect(JSON.parse(masked)).toEqual({
          rhachetRealpath: '/PATH_STRIPPED',
          hostTuple: 'linux-x64',
        });
      });
    });

    when('[t2] the WHOLE frame is masked, as an acceptance case sees it', () => {
      then('the composed frame parses from its own open brace', () => {
        const masked = asSnapshotSafe(
          [
            '💥 MalfunctionError: the reach socket is unavailable',
            '',
            '{',
            '  "hint": "the rhx you just ran loaded from /home/vlad/.local/bin/rhx — compare it",',
            '  "hostTuple": "linux-x64",',
            '  "rhachetRealpath": "/home/vlad/.local/bin/rhx"',
            '}',
          ].join('\n'),
        );
        const block = masked.slice(masked.indexOf('{'));
        expect(JSON.parse(block)).toEqual({
          hint: 'the rhx you just ran loaded from /PATH_STRIPPED — compare it',
          hostTuple: 'linux-x64',
          rhachetRealpath: '/PATH_STRIPPED',
        });
      });
    });
  });

  given('[case4] a path that must still be MASKED, so the fix cannot under-consume', () => {
    when('[t0] a machine-specific path reaches the mask', () => {
      then('no home directory name survives into a snapshot', () => {
        // the mask exists to keep a checkout-specific path out of a pinned artifact. a
        // tail class narrowed too far would leak it, and the suite would flake per machine
        expect(asSnapshotSafe('"at": "/home/vlad/git/rhachet/src/x.ts"')).not.toContain(
          'vlad',
        );
      });

      then('a path with no terminator at all is masked to its end', () => {
        expect(asSnapshotSafe('/home/vlad/git/rhachet')).toEqual('/PATH_STRIPPED');
      });
    });
  });
});
