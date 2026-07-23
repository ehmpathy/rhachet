import { given, then, when } from 'test-fns';

import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { getRoleDeltasOfKind } from './getRoleDeltasOfKind';

describe('getRoleDeltasOfKind', () => {
  const deltas = [
    new RoleDelta({ kind: 'addition', role: 'architect' }),
    new RoleDelta({ kind: 'subtraction', role: 'driver' }),
    new RoleDelta({ kind: 'addition', role: 'ergonomist' }),
  ];

  given('[case1] a mixed incremental delta list', () => {
    when('[t0] filtered by kind addition', () => {
      then('yields the addition roles, in order', () => {
        expect(getRoleDeltasOfKind({ deltas, kind: 'addition' })).toEqual([
          'architect',
          'ergonomist',
        ]);
      });
    });

    when('[t1] filtered by kind subtraction', () => {
      then('yields the subtraction roles', () => {
        expect(getRoleDeltasOfKind({ deltas, kind: 'subtraction' })).toEqual([
          'driver',
        ]);
      });
    });

    when('[t2] filtered by a kind with no matches', () => {
      then('yields an empty list', () => {
        expect(getRoleDeltasOfKind({ deltas, kind: 'absolute' })).toEqual([]);
      });
    });
  });

  given('[case2] absolute deltas', () => {
    when('[t0] filtered by kind absolute', () => {
      then('yields the absolute roles, in order', () => {
        expect(
          getRoleDeltasOfKind({
            deltas: [
              new RoleDelta({ kind: 'absolute', role: 'mechanic' }),
              new RoleDelta({ kind: 'absolute', role: 'behaver' }),
            ],
            kind: 'absolute',
          }),
        ).toEqual(['mechanic', 'behaver']);
      });
    });
  });

  given('[case3] an empty delta list', () => {
    when('[t0] filtered by any kind', () => {
      then('yields an empty list', () => {
        expect(getRoleDeltasOfKind({ deltas: [], kind: 'addition' })).toEqual(
          [],
        );
      });
    });
  });
});
