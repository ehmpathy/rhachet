import { given, then, when } from 'test-fns';

import { asPathsSorted } from './asPathsSorted';

describe('asPathsSorted', () => {
  given('[case1] paths in walk order, with upper and lower case', () => {
    const paths = ['briefs/b.md', 'briefs/A.md', 'briefs/a.md', 'boot.yml'];

    when('[t0] they are sorted', () => {
      const sorted = asPathsSorted({ paths });

      then('they read in code-point order, upper case first', () => {
        expect(sorted).toEqual([
          'boot.yml',
          'briefs/A.md',
          'briefs/a.md',
          'briefs/b.md',
        ]);
      });

      then('the input list is left as it was', () => {
        expect(paths).toEqual([
          'briefs/b.md',
          'briefs/A.md',
          'briefs/a.md',
          'boot.yml',
        ]);
      });
    });
  });
});
