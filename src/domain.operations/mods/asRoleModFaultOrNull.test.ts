import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRepoMutexHeldError } from '@src/infra/lock/asRepoMutexHeldError';

import { asRoleModFaultOrNull } from './asRoleModFaultOrNull';

describe('asRoleModFaultOrNull', () => {
  given('[case1] a refusal a mod raised', () => {
    when('[t0] it is classed', () => {
      then('it is the fault itself', () => {
        const error = new ConstraintError('the mod is refused');
        expect(asRoleModFaultOrNull({ error })).toBe(error);
      });
    });
  });

  given('[case2] a corrupt view record', () => {
    when('[t0] it is classed', () => {
      then('it is the fault itself', () => {
        const error = new MalfunctionError(
          'the modded view record is unreadable',
        );
        expect(asRoleModFaultOrNull({ error })).toBe(error);
      });
    });
  });

  given('[case3] an fs errno on a mod path', () => {
    when('[t0] it is classed', () => {
      then('it is a classed fault that names its fix', () => {
        const fault = asRoleModFaultOrNull({
          error: Object.assign(new Error('EACCES: denied'), { code: 'EACCES' }),
        });
        expect(fault).toBeInstanceOf(ConstraintError);
        expect(fault?.metadata).toMatchObject({ errno: 'EACCES' });
      });
    });
  });

  given('[case4] throws that are no fault of a mod', () => {
    when('[t0] a code defect is classed', () => {
      then('it is null, so the gate lets it escape loud', () => {
        expect(
          asRoleModFaultOrNull({ error: new TypeError('x is undefined') }),
        ).toBeNull();
      });
    });
    when('[t1] a value that is no error is classed', () => {
      then('it is null', () => {
        expect(asRoleModFaultOrNull({ error: { code: 'EACCES' } })).toBeNull();
      });
    });
    when('[t2] a held repo lock is classed', () => {
      then(
        'it is null, so a sound mod is never skipped for host contention',
        () => {
          const error = asRepoMutexHeldError({
            path: '/repo/.agent/.lock',
            waitMs: 10,
            cause: new Error('held'),
          });
          expect(asRoleModFaultOrNull({ error })).toBeNull();
        },
      );
    });
  });
});
