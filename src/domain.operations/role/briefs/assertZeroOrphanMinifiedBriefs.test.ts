import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertZeroOrphanMinifiedBriefs } from './assertZeroOrphanMinifiedBriefs';

describe('assertZeroOrphanMinifiedBriefs', () => {
  given('[case1] no orphans', () => {
    when('[t0] called with empty orphans', () => {
      then('does not throw', () => {
        expect(() =>
          assertZeroOrphanMinifiedBriefs({ orphans: [] }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] one orphan', () => {
    when('[t0] called with one orphan', () => {
      then('throws with orphan file name in message', () => {
        expect(() =>
          assertZeroOrphanMinifiedBriefs({
            orphans: [{ pathToMinified: '/briefs/foo.md.min' }],
          }),
        ).toThrow('foo.md.min');
      });
    });
  });

  given('[case3] two orphans', () => {
    when('[t0] called with two orphans', () => {
      then('throws with both file names in message', () => {
        expect(() =>
          assertZeroOrphanMinifiedBriefs({
            orphans: [
              { pathToMinified: '/briefs/a.md.min' },
              { pathToMinified: '/briefs/b.md.min' },
            ],
          }),
        ).toThrow(/a\.md\.min.*b\.md\.min/s);
      });
    });
  });

  // 🚨 the CLASS is the contract, never merely the words. an orphan sits in the CALLER's
  //   brief tree, so it is theirs to settle — a `ConstraintError` (exit 2) says so, while a
  //   bare `Error` reaches the cli with no verdict and the frame then guesses
  //   `MalfunctionError` (exit 1), which tells a human OUR install is damaged.
  //   cases 2 + 3 assert only the message, so both stay green under that regression —
  //   this case is the one that reddens.
  given('[case4] any orphan at all', () => {
    when('[t0] the assert throws', () => {
      const error = getError(() =>
        assertZeroOrphanMinifiedBriefs({
          orphans: [{ pathToMinified: '/briefs/foo.md.min' }],
        }),
      );

      then(
        'the class is ConstraintError — the caller settles it, not us',
        () => {
          expect(error).toBeInstanceOf(ConstraintError);
        },
      );

      then('the metadata names the fix and each orphan path', () => {
        const metadata = (error as ConstraintError).metadata as {
          hint: string;
          orphanPaths: string[];
        };
        expect(metadata.orphanPaths).toEqual(['/briefs/foo.md.min']);
        expect(metadata.hint).toContain('restore the absent .md');
        expect(metadata.hint).toContain('delete the orphan .md.min');
      });
    });
  });
});
