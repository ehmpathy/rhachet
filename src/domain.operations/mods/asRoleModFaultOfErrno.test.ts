import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModFaultOfErrno } from './asRoleModFaultOfErrno';

const asErrno = (input: { code: string; path: string | null }): Error =>
  Object.assign(
    new Error(`${input.code}: the fs refused`),
    input.path ? { code: input.code, path: input.path } : { code: input.code },
  );

describe('asRoleModFaultOfErrno', () => {
  given('[case1] no read access to a mod file', () => {
    when('[t0] the errno is classed', () => {
      const fault = asRoleModFaultOfErrno({
        error: asErrno({ code: 'EACCES', path: '/repo/role=surfer/boot.yml' }),
        code: 'EACCES',
      });

      then('it is a constraint, since the repo can repair the path', () => {
        expect(fault).toBeInstanceOf(ConstraintError);
      });
      then('it names the fs message and the fix for that path', () => {
        expect(fault.message).toContain('EACCES: the fs refused');
        expect(fault.metadata).toMatchObject({
          errno: 'EACCES',
          path: '/repo/role=surfer/boot.yml',
          fix: 'grant read access, via chmod u+r /repo/role=surfer/boot.yml',
        });
      });
    });
  });

  given(
    '[case2] a dir where the mod expects a file, with no path on the error',
    () => {
      when('[t0] the errno is classed', () => {
        const fault = asRoleModFaultOfErrno({
          error: asErrno({ code: 'EISDIR', path: null }),
          code: 'EISDIR',
        });

        then('it is a constraint, and its fix names the mod file', () => {
          expect(fault).toBeInstanceOf(ConstraintError);
          expect(fault.metadata).toMatchObject({
            path: null,
            fix: 'repair the mod file so it reads as the mod expects',
          });
        });
      });
    },
  );

  given('[case3] an errno the repo cannot repair', () => {
    when('[t0] the errno is classed', () => {
      const fault = asRoleModFaultOfErrno({
        error: asErrno({ code: 'EIO', path: '/repo/role=surfer/boot.yml' }),
        code: 'EIO',
      });

      then('it is a malfunction of the host', () => {
        expect(fault).toBeInstanceOf(MalfunctionError);
      });
    });
  });
});
