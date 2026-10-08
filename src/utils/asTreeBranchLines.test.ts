import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';

const TEST_CASES = [
  {
    description: 'no rows yield no lines',
    given: { rows: [], indent: '   ' },
    expect: { output: [] },
  },
  {
    description: 'one row takes the final elbow',
    given: { rows: ['alpha'], indent: '   ' },
    expect: { output: ['   └─ alpha'] },
  },
  {
    description: 'every row but the last takes the branch elbow',
    given: { rows: ['alpha', 'beta', 'gamma'], indent: '      ' },
    expect: {
      output: ['      ├─ alpha', '      ├─ beta', '      └─ gamma'],
    },
  },
];

describe('asTreeBranchLines', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asTreeBranchLines(thisCase.given)).toEqual(thisCase.expect.output);
    }),
  );
});
