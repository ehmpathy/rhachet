import { asHookSyncTotalRows } from './asHookSyncTotalRows';

const TEST_CASES = [
  {
    description: 'all zero renders no row',
    given: { created: 0, updated: 0, deleted: 0, orphansRemoved: 0 },
    expect: [],
  },
  {
    description: 'only nonzero totals render, in fixed order',
    given: { created: 2, updated: 0, deleted: 1, orphansRemoved: 3 },
    expect: ['2 created', '1 deleted', '3 orphans removed'],
  },
];

describe('asHookSyncTotalRows', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asHookSyncTotalRows(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
