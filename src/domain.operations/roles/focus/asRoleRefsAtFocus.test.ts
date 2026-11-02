import { given, then, when } from 'test-fns';

import { asRoleRefsAtFocus } from './asRoleRefsAtFocus';

describe('asRoleRefsAtFocus', () => {
  given('[case1] two linked roles, one focused in the record', () => {
    when('[t0] the refs are paired with the record', () => {
      then('the focused role carries its subjects, the other is whole', () => {
        expect(
          asRoleRefsAtFocus({
            refs: [
              { repo: 'ehmpathy', role: 'mechanic' },
              { repo: 'bhrain', role: 'driver' },
            ],
            foci: { mechanic: ['flow'] },
          }),
        ).toEqual([
          { repo: 'ehmpathy', role: 'mechanic', subjects: ['flow'] },
          { repo: 'bhrain', role: 'driver', subjects: null },
        ]);
      });
    });
  });

  given('[case2] an empty record', () => {
    when('[t0] the refs are paired with it', () => {
      then('every role is whole', () => {
        expect(
          asRoleRefsAtFocus({
            refs: [{ repo: 'ehmpathy', role: 'mechanic' }],
            foci: {},
          }),
        ).toEqual([{ repo: 'ehmpathy', role: 'mechanic', subjects: null }]);
      });
    });
  });
});
