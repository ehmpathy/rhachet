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
        // ⚠️ the message names the absent specifier, because node always does. it
        //   once read a bare `'Cannot find module'`, a shape node never emits — and
        //   an unfaithful fixture cannot clamp a guard that reads the specifier
        const absent = getPtyModuleOrNull({
          load: () => {
            const error: NodeJS.ErrnoException = new Error(
              "Cannot find module 'node-pty'\nRequire stack:\n- /repo/src/domain.operations/clone/pty/getPtyModuleOrNull.ts",
            );
            error.code = 'MODULE_NOT_FOUND';
            throw error;
          },
        });
        expect(absent).toBeNull();
      });

      then('a SUBPATH of node-pty is absent-addon too', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            const error: NodeJS.ErrnoException = new Error(
              "Cannot find module 'node-pty/lib/index.js'",
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
   * .what = MODULE_NOT_FOUND raised for a module that is NOT node-pty
   *
   * 🚨 .why it is its own case = one `code` covers two opposite conditions. node-pty
   *   absent is the optional-dependency case we degrade on; a require INSIDE node-pty
   *   that misses is a BROKEN INSTALL, and to answer it with `null` degrades the clone
   *   to a deaf spawn while it buries the fault (`rule.forbid.failhide`).
   *
   *   the code alone cannot part them; the specifier node names in the message can.
   *
   * ⚠️ .note = the fixture carries the `Require stack:` tail on purpose. that tail names
   *   OUR file path, so it contains the token `node-pty` — which is exactly why the
   *   marker is anchored to the quoted specifier. a loose `/node-pty/` would match this
   *   tail and grade the broken install as absent, and this row is what reddens if the
   *   anchor is ever loosened
   */
  given('[case2b] MODULE_NOT_FOUND for a TRANSITIVE dep of node-pty', () => {
    when('[t0] loaded', () => {
      then('it RETHROWS — a broken install is never an absent addon', () => {
        expect(() =>
          getPtyModuleOrNull({
            load: () => {
              const error: NodeJS.ErrnoException = new Error(
                "Cannot find module 'nan'\nRequire stack:\n- /repo/node_modules/node-pty/lib/index.js",
              );
              error.code = 'MODULE_NOT_FOUND';
              throw error;
            },
          }),
        ).toThrow("Cannot find module 'nan'");
      });
    });
  });

  // 🚨 [case3] is the FIELD-OBSERVED failure, quoted verbatim from node-pty's own
  //   `lib/utils.js` loader — a plain Error with NO `.code`, so [case2]'s code check
  //   cannot see it. this is the exact string the linux no-prebuild case emits, and the
  //   consumer clamp reproduces it end-to-end. it is stated as its own case rather than
  //   folded into a synthetic mashup, so a marker regression names its own emitter
  given('[case3] a loader that throws node-pty\u2019s own loader fault', () => {
    when('[t0] loaded', () => {
      then('it falls back to null (no prebuild for this platform)', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            throw new Error(
              "Failed to load native module: pty.node, checked: build/Release, build/Debug, prebuilds/linux-x64: Error: Cannot find module './prebuilds/linux-x64//pty.node'",
            );
          },
        });
        expect(absent).toBeNull();
      });
    });
  });

  given('[case4] a loader that throws the bindings-package fault', () => {
    when('[t0] loaded', () => {
      then('it falls back to null', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            throw new Error(
              'Could not locate the bindings file. Tried:\n → /app/build/Release/pty.node',
            );
          },
        });
        expect(absent).toBeNull();
      });
    });
  });

  given('[case5] a loader that throws an abi mismatch', () => {
    when('[t0] loaded', () => {
      then('it falls back to null', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            throw new Error(
              'The module was compiled against a different Node.js version. NODE_MODULE_VERSION 108 vs 115',
            );
          },
        });
        expect(absent).toBeNull();
      });
    });
  });

  given('[case6] a loader that throws a dlopen fault', () => {
    when('[t0] loaded', () => {
      then('it falls back to null', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            throw new Error(
              'dlopen(/app/prebuilds/linux-x64/pty.node, 0x0001): Library not loaded',
            );
          },
        });
        expect(absent).toBeNull();
      });
    });
  });

  given('[case7] a loader that throws a NON-load error (a real bug)', () => {
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

  // 🚨 [case8] is the CLAMP for the loose-token defect. a bare `/\.node\b/` marker would
  //   swallow this real bug to `null` — an addon-absent verdict over an error that names
  //   a `.node` path only incidentally, in its own stack. it must re-throw
  given('[case8] a real bug whose message merely NAMES a .node path', () => {
    when('[t0] loaded', () => {
      then('it re-throws — the token alone decides naught', async () => {
        const error = await getError(() =>
          getPtyModuleOrNull({
            load: () => {
              throw new TypeError(
                "cannot read property 'spawn' of undefined at /app/lib/wrap.node.js",
              );
            },
          }),
        );
        expect(error).toBeInstanceOf(TypeError);
      });
    });
  });

  // 🚨 [case9] is the CLAMP for the `ERR_DLOPEN_FAILED` code branch, and it is the ONLY row
  //   that reaches it. `[case6]`'s message carries `dlopen(`, so it satisfies
  //   PTY_ADDON_LOAD_MARKERS and returns before the code is ever read — delete the code
  //   check and `[case6]` stays green. this row's message matches NO marker, so the code is
  //   all that can decide it.
  //
  // ⚠️ the message is node's REAL linux shape: a glibc `dlerror` string, which carries no
  //   `dlopen(` token at all. that is the musl/alpine case the platform matrix names — a
  //   glibc binary that installs, then fails to load. the mutation that reddens this row is
  //   to delete the `code === 'ERR_DLOPEN_FAILED'` branch.
  given('[case9] a dlopen fault whose MESSAGE matches no marker', () => {
    when('[t0] loaded', () => {
      then('the code alone decides it, and it falls back to null', () => {
        const absent = getPtyModuleOrNull({
          load: () => {
            const error: NodeJS.ErrnoException = new Error(
              '/app/node_modules/node-pty/prebuilds/linux-x64/pty.node: undefined symbol: node_module_register',
            );
            error.code = 'ERR_DLOPEN_FAILED';
            throw error;
          },
        });
        expect(absent).toBeNull();
      });
    });
  });
});
