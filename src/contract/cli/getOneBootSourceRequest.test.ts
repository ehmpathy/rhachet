import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneBootSourceRequest } from './getOneBootSourceRequest';

/**
 * .what = clamps the shared cli flag contract every command that measures a boot reaches through
 * .why = each `[case]` is a flag combination that must refuse, never answer wrong at exit 0
 *        (`rule.require.failfast`)
 */
describe('getOneBootSourceRequest', () => {
  given('[case1] a --what spec path', () => {
    when('[t0] it stands alone', () => {
      then('it yields a manifest source, never a role one', () => {
        expect(
          getOneBootSourceRequest({ opts: { what: 'route/boot.yml' } }),
        ).toEqual({
          from: { manifest: { path: 'route/boot.yml' } },
          ifPresent: false,
        });
      });
    });

    when('[t1] it is paired with --role', () => {
      then('it refuses — a boot takes its spec from ONE place', () => {
        const error = getError(() =>
          getOneBootSourceRequest({
            opts: { what: 'route/boot.yml', role: 'mechanic' },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('--what cannot be used with');
      });
    });

    when('[t2] it is paired with --if-present', () => {
      then(
        'it refuses — a named path that points at no file is an error',
        () => {
          const error = getError(() =>
            getOneBootSourceRequest({
              opts: { what: 'route/boot.yml', ifPresent: true },
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('--if-present');
        },
      );
    });

    when('[t3] the flag carries no value', () => {
      // commander yields `true` for a value-less flag, so the guard is a type check
      // rather than a string check — an empty string alone would miss it
      then('it refuses rather than boot a path named `true`', () => {
        const error = getError(() =>
          getOneBootSourceRequest({
            opts: { what: true as unknown as string },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('--what requires a path');
      });
    });

    when('[t4] the flag carries only whitespace', () => {
      then('it refuses', () => {
        const error = getError(() =>
          getOneBootSourceRequest({ opts: { what: '   ' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case2] no --what and no --role', () => {
    when('[t0] the request is resolved', () => {
      then('it names the flag the caller must pass', () => {
        const error = getError(() => getOneBootSourceRequest({ opts: {} }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('--role is required');
      });
    });
  });
});
