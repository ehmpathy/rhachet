import { given, then, when } from 'test-fns';

import { getRolesIncrementalSummaryTree } from './getRolesIncrementalSummaryTree';

describe('getRolesIncrementalSummaryTree', () => {
  given('[case1] additions + subtractions + untouched', () => {
    when('[t0] all three sections have content', () => {
      then('renders additions/subtractions subtrees + untouched count', () => {
        const tree = getRolesIncrementalSummaryTree({
          additions: [{ repo: 'bhrain', role: 'learner' }],
          subtractions: [{ repo: 'ehmpathy', role: 'reviewer' }],
          untouchedCount: 9,
        });
        expect(tree).toEqual(
          [
            '🔧 init roles (incremental)',
            '   ├─ additions',
            '   │  └─ + bhrain/learner',
            '   ├─ subtractions',
            '   │  └─ - ehmpathy/reviewer',
            '   └─ untouched (9)',
          ].join('\n'),
        );
      });
    });
  });

  given('[case2] a subtraction only (no additions)', () => {
    when('[t0] additions is empty', () => {
      then('drops the additions subtree, subtractions is not last', () => {
        const tree = getRolesIncrementalSummaryTree({
          additions: [],
          subtractions: [{ repo: 'ehmpathy', role: 'reviewer' }],
          untouchedCount: 2,
        });
        expect(tree).toEqual(
          [
            '🔧 init roles (incremental)',
            '   ├─ subtractions',
            '   │  └─ - ehmpathy/reviewer',
            '   └─ untouched (2)',
          ].join('\n'),
        );
      });
    });
  });

  given('[case3] additions only (no subtractions)', () => {
    when('[t0] subtractions is empty', () => {
      then('drops the subtractions subtree', () => {
        const tree = getRolesIncrementalSummaryTree({
          additions: [
            { repo: 'ehmpathy', role: 'architect' },
            { repo: 'bhuild', role: 'behaver' },
          ],
          subtractions: [],
          untouchedCount: 3,
        });
        expect(tree).toEqual(
          [
            '🔧 init roles (incremental)',
            '   ├─ additions',
            '   │  ├─ + ehmpathy/architect',
            '   │  └─ + bhuild/behaver',
            '   └─ untouched (3)',
          ].join('\n'),
        );
      });
    });
  });

  given('[case4] neither additions nor subtractions', () => {
    when('[t0] both delta sections are empty (idempotent re-link)', () => {
      then('renders only the untouched count', () => {
        const tree = getRolesIncrementalSummaryTree({
          additions: [],
          subtractions: [],
          untouchedCount: 10,
        });
        expect(tree).toEqual(
          ['🔧 init roles (incremental)', '   └─ untouched (10)'].join('\n'),
        );
      });
    });
  });
});
