import { given, then } from 'test-fns';

import { asRefsGoneFromRevisions } from './asRefsGoneFromRevisions';

const TEST_CASES = [
  {
    description: 'no refs and no revisions',
    refs: [],
    revisions: [],
    gone: [],
  },
  {
    description: 'refs but no revisions: every distinct ref is gone',
    refs: ['a', 'b'],
    revisions: [],
    gone: ['a', 'b'],
  },
  {
    description: 'revisions but no refs: none is gone',
    refs: [],
    revisions: ['a', 'b'],
    gone: [],
  },
  {
    description: 'every ref names a revision',
    refs: ['a', 'b'],
    revisions: ['a', 'b', 'c'],
    gone: [],
  },
  {
    description: 'one ref names no revision',
    refs: ['a', 'x'],
    revisions: ['a'],
    gone: ['x'],
  },
  {
    description: 'a gone ref named by many clones is named once',
    refs: ['x', 'x', 'x'],
    revisions: ['a'],
    gone: ['x'],
  },
  {
    description: 'order of first sight is kept',
    refs: ['z', 'y', 'z', 'x', 'y'],
    revisions: [],
    gone: ['z', 'y', 'x'],
  },
  {
    description: 'a kept ref repeated is never gone',
    refs: ['a', 'a', 'x'],
    revisions: ['a'],
    gone: ['x'],
  },
  {
    description: 'match is exact, never by prefix',
    refs: ['abc'],
    revisions: ['abcd'],
    gone: ['abc'],
  },
];

describe('asRefsGoneFromRevisions', () => {
  given('[case1] a list of clone refs and a list of revisions', () => {
    TEST_CASES.map((testCase) =>
      then(`${testCase.description} → ${JSON.stringify(testCase.gone)}`, () => {
        expect(
          asRefsGoneFromRevisions({
            refs: testCase.refs,
            revisions: testCase.revisions,
          }),
        ).toEqual(testCase.gone);
      }),
    );
  });
});
