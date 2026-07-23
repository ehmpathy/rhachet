import { given, then, when } from 'test-fns';

import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { getRoleSlugsForFlags } from './getRoleSlugsForFlags';

describe('getRoleSlugsForFlags', () => {
  given('[case1] no deltas (no --roles passed)', () => {
    when('[t0] deltas is null', () => {
      then('yields an empty slug list', () => {
        expect(getRoleSlugsForFlags({ deltas: null })).toEqual([]);
      });
    });
  });

  given('[case2] absolute deltas', () => {
    when('[t0] mode is absolute', () => {
      then('yields the absolute slugs', () => {
        expect(
          getRoleSlugsForFlags({
            deltas: [
              new RoleDelta({ kind: 'absolute', role: 'mechanic' }),
              new RoleDelta({ kind: 'absolute', role: 'behaver' }),
            ],
          }),
        ).toEqual(['mechanic', 'behaver']);
      });
    });
  });

  given('[case3] incremental deltas', () => {
    when('[t0] mode is incremental with additions and subtractions', () => {
      then(
        'yields only the addition slugs (flags act on additions, never subtractions)',
        () => {
          expect(
            getRoleSlugsForFlags({
              deltas: [
                new RoleDelta({ kind: 'addition', role: 'architect' }),
                new RoleDelta({ kind: 'subtraction', role: 'reviewer' }),
              ],
            }),
          ).toEqual(['architect']);
        },
      );
    });
  });
});
