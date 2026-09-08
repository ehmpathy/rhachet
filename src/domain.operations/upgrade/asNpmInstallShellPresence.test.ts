import { given, then, when } from 'test-fns';

import { asNpmInstallShellPresence } from './asNpmInstallShellPresence';

/**
 * .what = clamps which hosts interpose a shell between us and the package manager
 *
 * .why  = the answer decides whether the timeout report may claim the package manager
 *   was killed. get it backwards and the report is confidently false on whichever host
 *   the mistake lands — see `[case7]` in `asNpmInstallFailureError.test.ts` for the
 *   sentence this datum governs.
 *
 * .note = every row runs on any host, because the platform is an INPUT. that is the
 *   whole point of the pure/ambient split: win32 is the only row that matters and no
 *   runner we own is win32, so an ambient read would leave it verified nowhere.
 */
describe('asNpmInstallShellPresence', () => {
  given('[case1] win32, whose package managers are .cmd shims', () => {
    when('[t0] the presence is read', () => {
      then('a shell is PRESENT — node cannot spawn a .cmd without one', () => {
        expect(asNpmInstallShellPresence({ platform: 'win32' })).toEqual(
          'present',
        );
      });
    });
  });

  given('[case2] the posix hosts', () => {
    when('[t0] the presence is read on each', () => {
      then('a shell is ABSENT — node finds the binary on PATH itself', () => {
        // 🚨 the row that keeps the win32 row honest. a renderer that returned
        //   'present' unconditionally would satisfy [case1] and make the timeout
        //   sentence hedge on EVERY host — the mirror defect, where a true and
        //   actionable claim is downgraded to a vague one for no reason
        expect(asNpmInstallShellPresence({ platform: 'linux' })).toEqual(
          'absent',
        );
        expect(asNpmInstallShellPresence({ platform: 'darwin' })).toEqual(
          'absent',
        );
      });
    });
  });

  given('[case3] a platform we hold no row for', () => {
    when('[t0] the presence is read', () => {
      then('it reads ABSENT, which is the safe default here', () => {
        // .why = the fallthrough must not hedge. `absent` yields the CONFIDENT
        //   sentence, and on every non-win32 host that sentence is true: node
        //   spawns the binary directly, so the bound lands on the process it
        //   names. win32 is the sole exception because it is the sole platform
        //   whose package managers are .cmd shims
        expect(asNpmInstallShellPresence({ platform: 'freebsd' })).toEqual(
          'absent',
        );
      });
    });
  });
});
