import { getAllFlagsRefusedBesideAll } from './getAllFlagsRefusedBesideAll';

const TEST_CASES = [
  {
    description: 'no per-payload flag yields none',
    given: {},
    expect: [],
  },
  {
    description: 'each passed flag is named, in declared order',
    given: { top: '3', role: 'mechanic', ifPresent: true },
    expect: ['--role', '--top', '--if-present'],
  },
  {
    description: 'an empty-string value still counts as passed',
    given: { what: '' },
    expect: ['--what'],
  },
];

describe('getAllFlagsRefusedBesideAll', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(getAllFlagsRefusedBesideAll({ opts: thisCase.given })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
