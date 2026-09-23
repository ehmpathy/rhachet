import { getError, given, then, when } from 'test-fns';

import { getEmulatorModuleOrNull } from './getEmulatorModuleOrNull';

describe('getEmulatorModuleOrNull.integration', () => {
  given('[case1] @xterm/headless is installed (the real pure-js dep)', () => {
    when('[t0] loaded with the default loader', () => {
      then('the module is returned, with a Terminal constructor', () => {
        const emulator = getEmulatorModuleOrNull();
        expect(emulator).not.toBeNull();
        expect(typeof emulator?.Terminal).toEqual('function');
      });
    });
  });

  given('[case2] a loader that throws MODULE_NOT_FOUND (dep absent)', () => {
    when('[t0] loaded', () => {
      then('it falls back to null, not a throw', () => {
        // ⚠️ the message names the absent specifier, because node always does. the marker is
        //   anchored to the QUOTED specifier so it cannot match the `Require stack:` tail,
        //   which names OUR own path in every MODULE_NOT_FOUND raised under this module
        const absent = getEmulatorModuleOrNull({
          load: () => {
            const error: NodeJS.ErrnoException = new Error(
              "Cannot find module '@xterm/headless'\nRequire stack:\n- /repo/src/domain.operations/clone/screen/getEmulatorModuleOrNull.ts",
            );
            error.code = 'MODULE_NOT_FOUND';
            throw error;
          },
        });
        expect(absent).toBeNull();
      });

      then('a SUBPATH of @xterm/headless is absent-dep too', () => {
        const absent = getEmulatorModuleOrNull({
          load: () => {
            const error: NodeJS.ErrnoException = new Error(
              "Cannot find module '@xterm/headless/lib/index.js'",
            );
            error.code = 'MODULE_NOT_FOUND';
            throw error;
          },
        });
        expect(absent).toBeNull();
      });
    });
  });

  /**
   * .what = MODULE_NOT_FOUND raised for a module that is NOT @xterm/headless
   *
   * 🚨 .why it is its own case = one `code` covers two opposite conditions. the dep absent is
   *   the degrade case; a require INSIDE @xterm/headless that misses is a BROKEN INSTALL, and
   *   to answer it with `null` degrades the clone to a screen-blind feed while it buries the
   *   fault (`rule.forbid.failhide`). the specifier node names in the message parts them.
   */
  given(
    '[case2b] MODULE_NOT_FOUND for a TRANSITIVE dep of the emulator',
    () => {
      when('[t0] loaded', () => {
        then('it RETHROWS — a broken install is never an absent dep', () => {
          expect(() =>
            getEmulatorModuleOrNull({
              load: () => {
                const error: NodeJS.ErrnoException = new Error(
                  "Cannot find module 'some-transitive'\nRequire stack:\n- /repo/node_modules/@xterm/headless/lib/index.js",
                );
                error.code = 'MODULE_NOT_FOUND';
                throw error;
              },
            }),
          ).toThrow("Cannot find module 'some-transitive'");
        });
      });
    },
  );

  given('[case3] a loader that throws a NON-load error (a real bug)', () => {
    when('[t0] loaded', () => {
      then(
        're-throws — never a silent null (rule.forbid.failhide)',
        async () => {
          const error = await getError(() =>
            getEmulatorModuleOrNull({
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
