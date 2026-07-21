import { given, then, when } from 'test-fns';

import { getUntouchedRoles } from './getUntouchedRoles';

describe('getUntouchedRoles', () => {
  given('[case1] a linked set with one just-added role', () => {
    when('[t0] the added role is excluded', () => {
      then('yields the linked roles minus the added one', () => {
        expect(
          getUntouchedRoles({
            linkedRoles: [
              { repo: 'ehmpathy', role: 'mechanic' },
              { repo: 'ehmpathy', role: 'architect' },
            ],
            rolesAdded: [{ repo: 'ehmpathy', role: 'architect' }],
          }),
        ).toEqual([{ repo: 'ehmpathy', role: 'mechanic' }]);
      });
    });
  });

  given('[case2] no roles added', () => {
    when('[t0] rolesAdded is empty', () => {
      then('every linked role is untouched', () => {
        const linkedRoles = [
          { repo: 'ehmpathy', role: 'mechanic' },
          { repo: 'bhuild', role: 'behaver' },
        ];
        expect(getUntouchedRoles({ linkedRoles, rolesAdded: [] })).toEqual(
          linkedRoles,
        );
      });
    });
  });

  given('[case3] same role slug under distinct repos', () => {
    when('[t0] only one repo variant was added', () => {
      then('the other repo variant stays untouched (repo-scoped match)', () => {
        expect(
          getUntouchedRoles({
            linkedRoles: [
              { repo: 'ehmpathy', role: 'reviewer' },
              { repo: 'bhuild', role: 'reviewer' },
            ],
            rolesAdded: [{ repo: 'bhuild', role: 'reviewer' }],
          }),
        ).toEqual([{ repo: 'ehmpathy', role: 'reviewer' }]);
      });
    });
  });
});
