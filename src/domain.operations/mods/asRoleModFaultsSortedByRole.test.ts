import { given, then, when } from 'test-fns';

import { asRoleModFaultsSortedByRole } from './asRoleModFaultsSortedByRole';

describe('asRoleModFaultsSortedByRole', () => {
  given('[case1] faults in walk order', () => {
    const faults = [
      { role: 'surfer', error: new Error('s') },
      { role: 'Lifeguard', error: new Error('L') },
      { role: 'lifeguard', error: new Error('l') },
    ];

    when('[t0] they are sorted', () => {
      const sorted = asRoleModFaultsSortedByRole({ faults });

      then(
        'they read in code-point order of their role, never the host collation',
        () => {
          expect(sorted.map((one) => one.role)).toEqual([
            'Lifeguard',
            'lifeguard',
            'surfer',
          ]);
        },
      );

      then('the input list is left as it was', () => {
        expect(faults.map((one) => one.role)).toEqual([
          'surfer',
          'Lifeguard',
          'lifeguard',
        ]);
      });
    });
  });
});
