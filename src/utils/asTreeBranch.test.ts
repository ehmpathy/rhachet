import { given, then } from 'test-fns';

import { asTreeBranch } from './asTreeBranch';

const TEST_CASES = [
  {
    description: 'the first of several items branches on and keeps its stem',
    given: { index: 0, count: 3 },
    expect: { branch: '├─', stem: '│  ' },
  },
  {
    description: 'a middle item branches on and keeps its stem',
    given: { index: 1, count: 3 },
    expect: { branch: '├─', stem: '│  ' },
  },
  {
    description: 'the last item closes the tree and leaves a blank stem',
    given: { index: 2, count: 3 },
    expect: { branch: '└─', stem: '   ' },
  },
  {
    description: 'a lone item is the last item',
    given: { index: 0, count: 1 },
    expect: { branch: '└─', stem: '   ' },
  },
];

describe('asTreeBranch', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('it yields the expected branch and stem', () => {
        expect(asTreeBranch(thisCase.given)).toEqual(thisCase.expect);
      });
    }),
  );
});
