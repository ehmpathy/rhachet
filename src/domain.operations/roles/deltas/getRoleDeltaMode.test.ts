import { given, then, when } from 'test-fns';

import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { getRoleDeltaMode } from './getRoleDeltaMode';

describe('getRoleDeltaMode', () => {
  given('[case1] all-absolute deltas', () => {
    when('[t0] every delta is kind absolute', () => {
      then('yields absolute mode', () => {
        expect(
          getRoleDeltaMode({
            deltas: [
              new RoleDelta({ kind: 'absolute', role: 'mechanic' }),
              new RoleDelta({ kind: 'absolute', role: 'behaver' }),
            ],
          }),
        ).toEqual('absolute');
      });
    });
  });

  given('[case2] deltas with an addition', () => {
    when('[t0] at least one delta is kind addition', () => {
      then('yields incremental mode', () => {
        expect(
          getRoleDeltaMode({
            deltas: [new RoleDelta({ kind: 'addition', role: 'architect' })],
          }),
        ).toEqual('incremental');
      });
    });
  });

  given('[case3] deltas with a subtraction', () => {
    when('[t0] at least one delta is kind subtraction', () => {
      then('yields incremental mode', () => {
        expect(
          getRoleDeltaMode({
            deltas: [new RoleDelta({ kind: 'subtraction', role: 'driver' })],
          }),
        ).toEqual('incremental');
      });
    });
  });

  given('[case4] an empty delta list', () => {
    when('[t0] no deltas are present', () => {
      then('yields absolute mode (replace with an empty set)', () => {
        expect(getRoleDeltaMode({ deltas: [] })).toEqual('absolute');
      });
    });
  });
});
