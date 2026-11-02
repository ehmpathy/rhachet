import { given, then, when } from 'test-fns';

import { asRepoAmbientRoleFocusChanges } from './asRepoAmbientRoleFocusChanges';

describe('asRepoAmbientRoleFocusChanges', () => {
  given('[case1] a held whole mechanic', () => {
    when('[t0] init narrows it with +mechanic::101', () => {
      then('the change reads as a narrow', () => {
        expect(
          asRepoAmbientRoleFocusChanges({
            rolesLinkedBefore: ['any', 'mechanic'],
            rolesLinkedAfter: ['any', 'mechanic'],
            fociPrior: {},
            foci: { mechanic: ['101'] },
            additions: ['mechanic::101'],
          }),
        ).toEqual([
          { role: 'mechanic', kind: 'narrow', from: null, to: ['101'] },
        ]);
      });
    });
  });

  given('[case2] a role this init linked for the first time', () => {
    when('[t0] init adds it at a focus', () => {
      then('the change reads as given — it was never held', () => {
        expect(
          asRepoAmbientRoleFocusChanges({
            rolesLinkedBefore: ['any'],
            rolesLinkedAfter: ['any', 'mechanic'],
            fociPrior: {},
            foci: { mechanic: ['101'] },
            additions: ['mechanic::101'],
          }),
        ).toEqual([
          { role: 'mechanic', kind: 'given', from: null, to: ['101'] },
        ]);
      });
    });

    when('[t1] init adds it whole', () => {
      then(
        'no change is reported — a whole role added is no focus change',
        () => {
          expect(
            asRepoAmbientRoleFocusChanges({
              rolesLinkedBefore: ['any'],
              rolesLinkedAfter: ['any', 'mechanic'],
              fociPrior: {},
              foci: {},
              additions: ['mechanic'],
            }),
          ).toEqual([]);
        },
      );
    });
  });

  given('[case3] a held mechanic at ::flow', () => {
    when('[t0] init re-types +mechanic::flow (E2)', () => {
      then('the change reads as unchanged', () => {
        expect(
          asRepoAmbientRoleFocusChanges({
            rolesLinkedBefore: ['mechanic'],
            rolesLinkedAfter: ['mechanic'],
            fociPrior: { mechanic: ['flow'] },
            foci: { mechanic: ['flow'] },
            additions: ['mechanic::flow'],
          }),
        ).toEqual([
          { role: 'mechanic', kind: 'unchanged', from: ['flow'], to: ['flow'] },
        ]);
      });
    });
  });
});
