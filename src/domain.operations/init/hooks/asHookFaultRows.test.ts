import { ConstraintError } from 'helpful-errors';

import { asHookFaultRows } from './asHookFaultRows';

const TEST_CASES = [
  {
    description: 'no fault renders no row',
    given: { faults: [] },
  },
  {
    description: 'each fault renders one row that names its source and class',
    given: {
      faults: [
        { source: 'actor', error: new ConstraintError('settings absent') },
        { source: 'repo', error: new TypeError('bad shape') },
      ],
    },
  },
];

describe('asHookFaultRows', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const rows = asHookFaultRows(thisCase.given);
      expect(rows).toHaveLength(thisCase.given.faults.length);
      thisCase.given.faults.forEach((fault, index) => {
        expect(rows[index]).toMatch(new RegExp(`^✗ ${fault.source}: `));
        expect(rows[index]).toContain(fault.error.constructor.name);
        expect(rows[index]).toContain(fault.error.message);
      });
      expect(rows).toMatchSnapshot();
    }),
  );
});
