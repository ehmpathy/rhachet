import { given, then } from 'test-fns';

import { asCountOfRefsInRevisions } from './asCountOfRefsInRevisions';

const TEST_CASES = [
  {
    description: 'no refs and no revisions',
    refs: [],
    revisions: [],
    count: 0,
  },
  {
    description: 'refs but no revisions',
    refs: ['a', 'b'],
    revisions: [],
    count: 0,
  },
  {
    description: 'revisions but no refs',
    refs: [],
    revisions: ['a', 'b'],
    count: 0,
  },
  {
    description: 'one ref in the revisions',
    refs: ['a'],
    revisions: ['a', 'b'],
    count: 1,
  },
  {
    description: 'refs in neither list overlap',
    refs: ['x', 'y'],
    revisions: ['a', 'b'],
    count: 0,
  },
  {
    description: 'dupe refs count once per clone (each ref is one clone)',
    refs: ['a', 'a', 'a'],
    revisions: ['a'],
    count: 3,
  },
  {
    description: 'dupe revisions never double count a ref',
    refs: ['a'],
    revisions: ['a', 'a'],
    count: 1,
  },
  {
    description: 'a mix of hits and misses',
    refs: ['a', 'x', 'b', 'a', 'y'],
    revisions: ['a', 'b', 'c'],
    count: 3,
  },
  {
    description: 'match is exact, never by prefix',
    refs: ['abc', 'ab'],
    revisions: ['abcd'],
    count: 0,
  },
];

describe('asCountOfRefsInRevisions', () => {
  given('[case1] a list of clone refs and a list of revisions', () => {
    TEST_CASES.map((testCase) =>
      then(`${testCase.description} → ${testCase.count}`, () => {
        expect(
          asCountOfRefsInRevisions({
            refs: testCase.refs,
            revisions: testCase.revisions,
          }),
        ).toEqual(testCase.count);
      }),
    );
  });
});
