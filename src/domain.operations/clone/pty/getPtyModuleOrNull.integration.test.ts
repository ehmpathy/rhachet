import { getError, given, then, when } from 'test-fns';

import { getPtyModuleOrNull } from './getPtyModuleOrNull';

describe('getPtyModuleOrNull.integration', () => {
  given('[case1] node-pty is installed (the real optional addon)', () => {
    when('[t0] loaded with the default loader', () => {
      then('the module is returned, with a spawn function', () => {
        const pty = getPtyModuleOrNull();
        expect(pty).not.toBeNull();
        expect(typeof pty?.spawn).toEqual('function');
      });
    });
  });

  given('[case2] a loader that throws MODULE_NOT_FOUND (addon absent)', () => {
    when('[t0] loaded', () => {
      then('it falls back to null, not a throw', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            const error: NodeJS.ErrnoException = new Error(
              'Cannot find module',
            );
            error.code = 'MODULE_NOT_FOUND';
            throw error;
          },
        });
        expect(absent).toBeNull();
      });
    });
  });

  given('[case3] a loader that throws a native-bind load fault', () => {
    when('[t0] loaded', () => {
      then('it falls back to null (the addon failed to dlopen)', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            throw new Error(
              'Could not locate the bindings file. was compiled against a different NODE_MODULE_VERSION',
            );
          },
        });
        expect(absent).toBeNull();
      });
    });
  });

  given('[case4] a loader that throws a NON-load error (a real bug)', () => {
    when('[t0] loaded', () => {
      then(
        'it re-throws — never a silent null (rule.forbid.failhide)',
        async () => {
          const error = await getError(() =>
            getPtyModuleOrNull({
              load: () => {
                throw new SyntaxError('unexpected token in our own code');
              },
            }),
          );
          expect(error).toBeInstanceOf(SyntaxError);
        },
      );
    });
  });
});
