import { given, then, when } from 'test-fns';

import { asTreeBranchGlyphs } from './asTreeBranchGlyphs';

const TEST_CASES = [
  { description: 'the first of three rows', index: 0, total: 3, expect: { branch: '├─', stem: '│  ' } },
  { description: 'the last of three rows', index: 2, total: 3, expect: { branch: '└─', stem: '   ' } },
  { description: 'the sole row', index: 0, total: 1, expect: { branch: '└─', stem: '   ' } },
];

describe('asTreeBranchGlyphs', () => {
  given('[case1] a row of a treestruct list', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('it keeps the list open, or closes it on the last row', () => {
          expect(
            asTreeBranchGlyphs({ index: thisCase.index, total: thisCase.total }),
          ).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
