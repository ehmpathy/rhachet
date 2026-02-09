import { given, then, when } from 'test-fns';

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
});
