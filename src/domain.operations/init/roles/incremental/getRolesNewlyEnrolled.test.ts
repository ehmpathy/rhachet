import { given, then, when } from 'test-fns';

import { getRolesNewlyEnrolled } from './getRolesNewlyEnrolled';

describe('getRolesNewlyEnrolled', () => {
  given('[case1] a candidate absent from the linked-before set', () => {
    when('[t0] the candidate is filtered against an empty prior set', () => {
      then('yields the candidate as newly enrolled', () => {
        expect(
          getRolesNewlyEnrolled({
            candidates: [{ repo: 'ehmpathy', role: 'architect' }],
            linkedBefore: [],
          }),
        ).toEqual([{ repo: 'ehmpathy', role: 'architect' }]);
      });
    });
  });

  given(
    '[case2] a candidate already present in the linked-before set (re-add)',
    () => {
      when('[t0] the same repo/role was linked before', () => {
        then(
          'filters it out — an already-linked re-add is not newly enrolled',
          () => {
            expect(
              getRolesNewlyEnrolled({
                candidates: [{ repo: 'ehmpathy', role: 'mechanic' }],
                linkedBefore: [{ repo: 'ehmpathy', role: 'mechanic' }],
              }),
            ).toEqual([]);
          },
        );
      });
    },
  );

  given('[case3] same role slug under distinct repos', () => {
    when('[t0] only one repo variant was linked before', () => {
      then(
        'the other repo variant is newly enrolled (repo-scoped match)',
        () => {
          expect(
            getRolesNewlyEnrolled({
              candidates: [
                { repo: 'ehmpathy', role: 'reviewer' },
                { repo: 'bhuild', role: 'reviewer' },
              ],
              linkedBefore: [{ repo: 'ehmpathy', role: 'reviewer' }],
            }),
          ).toEqual([{ repo: 'bhuild', role: 'reviewer' }]);
        },
      );
    });
  });

  given('[case4] a mix of absent and already-linked candidates', () => {
    when('[t0] filtered against a partial prior set', () => {
      then('yields only the candidates absent from the prior set', () => {
        expect(
          getRolesNewlyEnrolled({
            candidates: [
              { repo: 'ehmpathy', role: 'mechanic' },
              { repo: 'ehmpathy', role: 'architect' },
              { repo: 'bhuild', role: 'behaver' },
            ],
            linkedBefore: [{ repo: 'ehmpathy', role: 'mechanic' }],
          }),
        ).toEqual([
          { repo: 'ehmpathy', role: 'architect' },
          { repo: 'bhuild', role: 'behaver' },
        ]);
      });
    });
  });
});
