import { given, then, when } from 'test-fns';

import { asNpmInstallFailureKind } from './asNpmInstallFailureKind';

describe('asNpmInstallFailureKind', () => {
  given('[case1] output that names a permission code', () => {
    when('[t0] pnpm reports EACCES', () => {
      then('it classifies as permission-denied', () => {
        expect(
          asNpmInstallFailureKind({
            output: 'ERR_PNPM_EACCES  EACCES: permission denied',
          }),
        ).toEqual('permission-denied');
      });
    });

    when('[t1] npm reports EPERM on windows', () => {
      then('it classifies as permission-denied', () => {
        expect(
          asNpmInstallFailureKind({ output: 'npm ERR! code EPERM' }),
        ).toEqual('permission-denied');
      });
    });

    when('[t1b] the posix syscall message stands alone', () => {
      then('it classifies as permission-denied', () => {
        // .why = the shape a manager surfaces verbatim from the syscall, with no code
        //   line beside it. a marker set anchored to `code EACCES` alone would send a
        //   real wall to `unclassified` — the inverse defect of the one `[t2b]` guards
        expect(
          asNpmInstallFailureKind({
            output:
              "EACCES: permission denied, mkdir '/usr/local/lib/node_modules/rhachet'",
          }),
        ).toEqual('permission-denied');
      });
    });

    // 🚨 THE NEGATIVE CONTROLS for this row's WIDTH — the mirror of `[case6] [t2b]/[t2c]`.
    //
    //   the permission marker must stay ANCHORED. the co-occurrence guard does not cover
    //   a bare token match: when the real failure carries no recognizable code of its
    //   own, `getAllCausesBeyondPermission` returns `[]`, so an incidental MENTION reads
    //   as decisive.
    //
    //   the mutation that reddens both rows below: restore the bare
    //   `input.output.includes('EACCES') || input.output.includes('EPERM')`
    //
    //   ⚠️ both rows carry NO other cause marker on purpose. a control that also trips
    //     the co-occurrence guard reaches `unclassified` whether the marker is anchored
    //     or bare, so it passes under the defect (`rule.require.clamp-edge-cases`)
    when('[t2b] a nested tool QUOTES the token in its own prose', () => {
      then('the quoted mention does not decide the kind', () => {
        // .why = a build tool explains what it would do on a permission fault, while
        //   the install died of an unrelated cause
        expect(
          asNpmInstallFailureKind({
            output: [
              'node-pre-gyp info check checked for prebuilt binary',
              'node-pre-gyp WARN install if you see EACCES below, re-run with a writable cache',
              'node-pre-gyp ERR! install error: unexpected end of file',
            ].join('\n'),
          }),
        ).toEqual('unclassified');
      });
    });

    when('[t2c] the token rides in a PATH with no permission report', () => {
      then('a path that carries EPERM does not decide the kind', () => {
        // .why = no `code EPERM`, no `ERR_PNPM_EPERM`, no posix message — only four
        //   characters inside a directory name. to classify from that is to name a cause
        //   we did not find (`rule.forbid.failhide`)
        expect(
          asNpmInstallFailureKind({
            output:
              'ELIFECYCLE  Command failed at /home/dev/EPERM-testfixtures/pkg',
          }),
        ).toEqual('unclassified');
      });
    });

    // 🚨 THE NEGATIVE CONTROL for the OTHER half of the scan. `[t2b]`/`[t2c]` above guard
    //   the MATCH markers — that an incidental mention must not CREATE a permission
    //   verdict. this row guards the CO-OCCURRENCE codes — that an incidental mention
    //   must not DESTROY one.
    //
    //   both halves read the same log and both were meant to be anchored; only the match
    //   half actually was. so a real wall whose log carried a word-joined code lost its
    //   actionable cure and got *"read the output above"* instead — the same degradation,
    //   arrived at from the opposite direction (raised by the r009 lane at i065).
    //
    //   the mutation that reddens this row: restore the bare
    //   `input.output.includes(code)` in `getAllOtherCauses`
    when('[t2d] the log JOINS an unrelated code into a longer word', () => {
      then(
        'a word-joined code does not destroy a real permission verdict',
        () => {
          // .why = `ENOSPC` is a real independent cause and `ENOSPC_RETRY_BUDGET` is a knob
          //   named after one. a wall that mentions the knob is still just a wall, and the
          //   caller can still act on it — so it must keep `permission-denied`
          expect(
            asNpmInstallFailureKind({
              output: [
                'npm ERR! code EACCES',
                "npm ERR! syscall mkdir '/usr/local/lib/node_modules/rhachet'",
                'npm ERR! configured ENOSPC_RETRY_BUDGET=3, ENOENT_backup=off',
              ].join('\n'),
            }),
          ).toEqual('permission-denied');
        },
      );
    });

    // ⚠️ THE ANTI-VACUOUS PEER of `[t2d]`. without it, `[t2d]` alone is also green on a
    //   scan that stopped to read `CODES_INDEPENDENT` at all — the co-occurrence guard
    //   would be dead and both rows would still pass. this one proves the guard is LIVE:
    //   the same wall, with a code that stands as its own word, must still reach
    //   `unclassified` (`rule.forbid.faked-or-quarantined-acceptance`)
    when(
      '[t2e] the log names a STANDALONE unrelated code beside the wall',
      () => {
        then('a real second cause still reaches unclassified', () => {
          expect(
            asNpmInstallFailureKind({
              output: [
                'npm ERR! code EACCES',
                "npm ERR! syscall mkdir '/usr/local/lib/node_modules/rhachet'",
                'npm ERR! ENOSPC: no space left on device',
              ].join('\n'),
            }),
          ).toEqual('unclassified');
        });
      },
    );
  });

  given('[case2] output that reports only a gated build hook', () => {
    // ⚠️ this row is UNREACHABLE from both production call sites today:
    //   - the global path (`pnpm add -g`) exits 0 at both package-manager majors, so
    //     `execNpmInstallGlobal` never gets a nonzero exit to classify (`[case9]`)
    //   - the local path passes `--ignore-scripts`, so no build hook is gated to report
    //
    //   it is KEPT because the `--ignore-scripts` flag is a decision we could reverse,
    //   and the day it is reversed this row goes live
    when('[t0] pnpm reports ERR_PNPM_IGNORED_BUILDS', () => {
      then('it classifies as build-gate-blocked', () => {
        expect(
          asNpmInstallFailureKind({
            output:
              '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: node-pty@1.2.0-beta.15',
          }),
        ).toEqual('build-gate-blocked');
      });
    });
  });

  given('[case3] output we have no rule for', () => {
    when('[t0] the cause cannot be placed', () => {
      then('it classifies as unclassified, never a nearest guess', () => {
        // .why = the guard. an unplaced exit is reported AS unplaced. the mutation
        //   that reddens this: return 'permission-denied' as the default
        expect(
          asNpmInstallFailureKind({
            output: 'ENOSPC: no space left on device',
          }),
        ).toEqual('unclassified');
      });
    });

    when('[t1] there is no output at all', () => {
      then('it still classifies rather than throw', () => {
        // an install that printed naught is exactly the case a text rule cannot
        // place, and the caller still needs an answer to branch on
        expect(asNpmInstallFailureKind({ output: '' })).toEqual('unclassified');
      });
    });
  });

  given(
    '[case4] output that carries BOTH a permission code and a gate notice',
    () => {
      when('[t0] the two appear together', () => {
        then('permission wins — it is the one a human must act on', () => {
          // .why = order is a decision, not an accident. a gated build hook is benign;
          //   a permission wall is not. to report the benign one would hide the defect
          expect(
            asNpmInstallFailureKind({
              output: [
                '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: node-pty',
                'ERR_PNPM_EACCES  EACCES: permission denied',
              ].join('\n'),
            }),
          ).toEqual('permission-denied');
        });
      });
    },
  );

  given(
    '[case5] output that carries a REAL failure beside the gate notice',
    () => {
      // 🚨 THE FAILHIDE CLAMP. pnpm prints ERR_PNPM_IGNORED_BUILDS whenever ANY
      //   dependency's build hook is gated — even on an install that ALSO failed for a
      //   real reason. to honor the notice there is to report a broken install as a
      //   success (rule.forbid.failhide).
      //
      //   the mutation that reddens every row below: drop the other-marker check and
      //   return 'build-gate-blocked' whenever the notice appears.
      when('[t0] a disk-space failure rides along with the notice', () => {
        then(
          'it classifies as unclassified — the notice does NOT absolve it',
          () => {
            expect(
              asNpmInstallFailureKind({
                output: [
                  '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: node-pty',
                  'ENOSPC: no space left on device',
                ].join('\n'),
              }),
            ).toEqual('unclassified');
          },
        );
      });

      when('[t1] a pnpm fetch failure rides along with the notice', () => {
        then(
          'the notice does not absolve it — the 404 is named instead',
          () => {
            // .why = the notice absolves only when it stands alone. this yields
            //   `package-absent` rather than `unclassified` because the 404 is a cause
            //   we can NAME — the notice is read past, not honored
            expect(
              asNpmInstallFailureKind({
                output: [
                  '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: node-pty',
                  'ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/ghost: Not Found',
                ].join('\n'),
              }),
            ).toEqual('package-absent');
          },
        );
      });

      when('[t2] an npm failure banner rides along with the notice', () => {
        then('the npm banner defeats the notice', () => {
          expect(
            asNpmInstallFailureKind({
              output: [
                '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: node-pty',
                'npm ERR! code ENOTFOUND',
              ].join('\n'),
            }),
          ).toEqual('unclassified');
        });
      });

      when('[t3] the notice truly stands alone', () => {
        then('it is still benign — the guard must not over-fire', () => {
          // .why = the negative control. a guard that fired on every gate notice would
          //   report a false failure, so the benign row must stay benign
          expect(
            asNpmInstallFailureKind({
              output: [
                'Ignored build scripts: node-pty@1.2.0-beta.15.',
                '[ERR_PNPM_IGNORED_BUILDS]',
                'Run "pnpm approve-builds" to pick which dependencies should be built.',
              ].join('\n'),
            }),
          ).toEqual('build-gate-blocked');
        });
      });
    },
  );

  given(
    '[case6] output that carries a REAL failure beside a PERMISSION code',
    () => {
      // 🚨 THE MIRROR OF [case5]: the permission code absolves an exit only when it
      //   stands alone. an EACCES beside a full disk read as `permission-denied` hands
      //   the human "retry with elevated permissions" — a confident cure over a cause
      //   sudo cannot touch (rule.forbid.failhide).
      //
      //   the mutation that reddens [t0] and [t1]: drop the `causesOther` check and
      //   return 'permission-denied' whenever a permission code appears.
      when('[t0] a disk-space failure sits beside the permission code', () => {
        then(
          'it classifies as unclassified — sudo cannot fix a full disk',
          () => {
            expect(
              asNpmInstallFailureKind({
                output: [
                  'ERR_PNPM_EACCES  EACCES: permission denied',
                  'ENOSPC: no space left on device',
                ].join('\n'),
              }),
            ).toEqual('unclassified');
          },
        );
      });

      when('[t1] a registry 404 sits beside the permission code', () => {
        then('the independent cause defeats the permission read', () => {
          expect(
            asNpmInstallFailureKind({
              output: [
                'EACCES: permission denied, mkdir /usr/local/lib/node_modules',
                'ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/ghost: Not Found',
              ].join('\n'),
            }),
          ).toEqual('unclassified');
        });
      });

      // 🚨 the three negative controls below are why this guard is NARROWER than the
      //   gate-notice one. each names a marker that ACCOMPANIES a permission wall rather
      //   than competes with it — a guard that counted any of them would send every real
      //   permission failure to `unclassified`, which strips the one cure that WORKS
      when('[t2] npm reports the wall through its own generic banner', () => {
        then('the banner does NOT defeat it — npm wraps every failure', () => {
          expect(
            asNpmInstallFailureKind({
              output: [
                'npm ERR! code EACCES',
                'npm ERR! syscall mkdir',
                'npm ERR! Error: EACCES: permission denied',
              ].join('\n'),
            }),
          ).toEqual('permission-denied');
        });
      });

      when('[t3] pnpm names the SAME wall with its own code', () => {
        then('its own permission code does not defeat it', () => {
          expect(
            asNpmInstallFailureKind({
              output: 'ERR_PNPM_EACCES  EACCES: permission denied',
            }),
          ).toEqual('permission-denied');
        });
      });

      when('[t4] an absent path is reported beside the wall', () => {
        then('ENOENT does not defeat it — it is often the consequence', () => {
          // .why = an unreadable path frequently reports as absent, so ENOENT beside
          //   EACCES is usually one event, not two
          expect(
            asNpmInstallFailureKind({
              output: [
                'EACCES: permission denied, open /usr/local/lib/node_modules/.pnpm',
                'ENOENT: no such file or directory',
              ].join('\n'),
            }),
          ).toEqual('permission-denied');
        });
      });
    },
  );

  given(
    '[case7] output that names a package the registry does not hold',
    () => {
      // 🚨 THE MOST COMMON UPGRADE FAILURE — a typo in a role slug. `unclassified`
      //   hints *"read the pnpm output above"*, which names no fix
      //   (rule.require.errors-name-the-fix).
      //
      //   the mutation that reddens [t0]–[t2] and [t5]: delete the
      //   `isPackageAbsentReport` row and let a 404 fall through to the default.
      when('[t0] pnpm reports its own fetch-404 code', () => {
        then('it classifies as package-absent', () => {
          expect(
            asNpmInstallFailureKind({
              output:
                'ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/rhachet-roles-bhrian: Not Found - 404',
            }),
          ).toEqual('package-absent');
        });
      });

      when('[t1] npm reports its E404 code', () => {
        then('it classifies as package-absent', () => {
          expect(
            asNpmInstallFailureKind({
              output: 'npm ERR! code E404\nnpm ERR! 404 Not Found',
            }),
          ).toEqual('package-absent');
        });
      });

      when('[t2] npm 10 words its code line as `npm error`', () => {
        then('it classifies as package-absent', () => {
          // .why = npm renamed its banner from `npm ERR!` to `npm error` at v10, so the
          //   marker must match both or a whole npm major reports as `unclassified`
          expect(
            asNpmInstallFailureKind({
              output: 'npm error code E404\nnpm error 404 Not Found',
            }),
          ).toEqual('package-absent');
        });
      });

      // 🚨 the negative controls for the marker's WIDTH. the log is not the package
      //   manager's verdict, it is EVERYTHING the run printed — a nested tool's quoted
      //   error, a registry URL, a path segment. any of those can carry the token while
      //   the real failure is unrelated.
      //
      //   the mutation that reddens both rows below: restore the bare
      //   `input.output.includes('E404') || input.output.includes('404 Not Found')`
      //
      //   ⚠️ both rows below carry NO other cause marker on purpose. a control paired
      //     with `ENOSPC` / `ECONNRESET` has no teeth, since
      //     `getAllCausesBeyondAbsence` counts both and the co-occurrence guard reaches
      //     `unclassified` whether the marker is anchored or bare
      //     (`rule.require.clamp-edge-cases`)
      when('[t2b] node-gyp QUOTES a 404 while it fetches node headers', () => {
        then('the quoted 404 does not decide the kind', () => {
          // .why = the form of this trap in THIS repo: node-pty's build hook runs
          //   node-gyp, which prints a 404 of its own when a headers mirror lacks a
          //   file. the package itself installed fine
          expect(
            asNpmInstallFailureKind({
              output: [
                'gyp ERR! stack Error: unexpected response "404 Not Found"',
                'gyp ERR! stack   from https://nodejs.org/download/release/v20.0.0/SHASUMS256.txt',
                'gyp ERR! not ok',
              ].join('\n'),
            }),
          ).toEqual('unclassified');
        });
      });

      when(
        '[t2c] the token rides in a URL with no package-manager code',
        () => {
          then('a path that carries E404 does not decide the kind', () => {
            // .why = the registry answered no such thing here; there is no `code E404` line
            //   and no `ERR_PNPM_FETCH_404`. to classify from the token alone would be to
            //   name a cause we did not find (`rule.forbid.failhide`)
            expect(
              asNpmInstallFailureKind({
                output:
                  'GET https://registry.test/pkg/E404/tarball: unexpected end of file',
              }),
            ).toEqual('unclassified');
          });
        },
      );

      // 🚨 the two co-occurrence rows below hold the SAME discipline `[case5]` and
      //   `[case6]` hold: one signal absolves, two signals mean we do not know
      when('[t3] a full disk sits beside the 404', () => {
        then('it classifies as unclassified — that is two events', () => {
          expect(
            asNpmInstallFailureKind({
              output: [
                'ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/ghost: Not Found',
                'ENOSPC: no space left on device',
              ].join('\n'),
            }),
          ).toEqual('unclassified');
        });
      });

      when('[t4] a DNS failure sits beside the 404', () => {
        then('ENOTFOUND defeats it — the network itself is suspect', () => {
          // .why = a 404 is DECISIVE alone, because the registry ANSWERED and said no
          //   such package. ENOTFOUND says the registry was never reached at all, so a
          //   log with both describes two events and we cannot say which failed
          expect(
            asNpmInstallFailureKind({
              output: [
                'ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/ghost: Not Found',
                'ENOTFOUND registry.npmjs.org',
              ].join('\n'),
            }),
          ).toEqual('unclassified');
        });
      });

      when('[t5] npm wraps its 404 in the generic failure banner', () => {
        then('the banner does NOT defeat it — npm wraps every failure', () => {
          // .why = the negative control, and the same trap `[case6] [t2]` names. to
          //   count `npm ERR!` against this row would send EVERY npm typo to
          //   `unclassified`
          expect(
            asNpmInstallFailureKind({
              output: [
                'npm ERR! code E404',
                'npm ERR! 404 Not Found - GET https://registry.npmjs.org/rhachet-roles-bhrian',
                'npm ERR! 404  rhachet-roles-bhrian@latest is not in this registry.',
              ].join('\n'),
            }),
          ).toEqual('package-absent');
        });
      });
    },
  );
});
