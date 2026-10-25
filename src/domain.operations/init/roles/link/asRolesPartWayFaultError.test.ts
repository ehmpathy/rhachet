import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import {
  asRolesPartWayFaultError,
  isRolesPartWayFaultError,
  RolesPartWayConstraintError,
  RolesPartWayMalfunctionError,
} from './asRolesPartWayFaultError';

const sets = {
  failed: { repo: 'test', role: 'tester' },
  linked: [{ repo: 'test', role: 'tester' }],
  notLinked: [{ repo: 'test', role: 'reviewer' }],
};

describe('asRolesPartWayFaultError', () => {
  given('[case1] a cause the system cannot classify (a bare Error)', () => {
    when('[t0] the fault is named', () => {
      const error = asRolesPartWayFaultError({
        cause: new Error('init command failed: fail.sh (exit code 1)'),
        ...sets,
      });

      then('it is a malfunction, exit 1', () => {
        expect(error).toBeInstanceOf(RolesPartWayMalfunctionError);
        expect(error).toBeInstanceOf(MalfunctionError);
      });

      then(
        'it names the failed role, the linked set and the unlinked set',
        () => {
          expect(error.message).toContain(
            'role init failed part-way, at repo=test/role=tester',
          );
          expect(error.message).toContain('repo=test/role=reviewer');
          expect(error).toHaveProperty(
            'cause.message',
            'init command failed: fail.sh (exit code 1)',
          );
        },
      );

      then('the guard knows it', () => {
        expect(isRolesPartWayFaultError(error)).toBe(true);
      });
    });
  });

  given('[case2] a cause a caller must fix (a ConstraintError)', () => {
    when('[t0] the fault is named', () => {
      const error = asRolesPartWayFaultError({
        cause: new ConstraintError('pnpm is required'),
        ...sets,
      });

      then('it stays a constraint, exit 2', () => {
        expect(error).toBeInstanceOf(RolesPartWayConstraintError);
        expect(error).toBeInstanceOf(ConstraintError);
        expect(isRolesPartWayFaultError(error)).toBe(true);
      });
    });
  });

  given('[case3] an error that is not a part-way fault', () => {
    when('[t0] the guard reads it', () => {
      then('it is not known', () => {
        expect(isRolesPartWayFaultError(new MalfunctionError('other'))).toBe(
          false,
        );
      });
    });
  });
});
