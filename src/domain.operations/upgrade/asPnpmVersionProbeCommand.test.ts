import { given, then, when } from 'test-fns';

import { asPnpmVersionProbeCommand } from './asPnpmVersionProbeCommand';

/**
 * 🚨 ZERO mocks, and that is the point of this file. the probe's command used to be
 *   assertable only through a `jest.mock('node:child_process')` — so every claim below was
 *   checked against the mock's own construction, and a real `spawnSync` misuse stayed green
 *   (`rule.forbid.unit.remote-boundaries`). as a pure value the same claims are read
 *   directly, and the real spawn is exercised at the integration tier instead.
 */
describe('asPnpmVersionProbeCommand', () => {
  given('[case1] any platform at all', () => {
    when('[t0] the command is read', () => {
      const probe = asPnpmVersionProbeCommand({ platform: 'linux' });

      then('it runs pnpm ITSELF, never a lookup binary', () => {
        // 🚨 this row clamps the DESIGN, not a name. a PATH lookup answers *"is there a file
        //   named pnpm"*; a run of pnpm answers *"can i run pnpm"*, and only the second is
        //   the caller's question — a corrupt shim satisfies the first and fails the second
        expect(probe.command).toEqual('pnpm');
      });

      then('the DASHES are carried', () => {
        // 🚨 `pnpm version` without them bumps package.json and can tag — a probe that
        //   mutates the repo, and one the retry would then run twice
        expect(probe.args).toEqual(['--version']);
      });

      then('the time bound is carried', () => {
        // 🚨 asserted, never incidental: with no `timeout` a PATH entry on a wedged network
        //   mount hangs the whole upgrade forever
        expect(probe.options.timeout).toEqual(10_000);
      });

      then('output is piped rather than inherited', () => {
        // a version string is our datum, never the human's — it must not reach their screen
        expect(probe.options.stdio).toEqual('pipe');
      });
    });
  });

  // 🚨 the per-platform shell rule, asserted on BOTH sides. a single-platform row passes
  //   under an unconditional `shell: true` and under an unconditional `false` alike, so the
  //   pair is what holds the rule.
  //   .the mutation that reddens these = hardcode `shell` either way
  given('[case2] a posix host, where node can spawn pnpm directly', () => {
    when('[t0] the command is read on linux', () => {
      then(
        'NO shell is used — the bound must reach pnpm, not a wrapper',
        () => {
          // 🚨 under `shell: true` the timeout kills the `sh -c` wrapper and ORPHANS pnpm
          //   beneath it, which stays alive and holds its store lock. the probe retries, so
          //   an unconditional shell could strand two
          expect(
            asPnpmVersionProbeCommand({ platform: 'linux' }).options.shell,
          ).toEqual(false);
        },
      );
    });

    when('[t1] the command is read on darwin', () => {
      then('NO shell is used there either', () => {
        expect(
          asPnpmVersionProbeCommand({ platform: 'darwin' }).options.shell,
        ).toEqual(false);
      });
    });
  });

  given('[case3] win32, where pnpm is a .cmd shim', () => {
    when('[t0] the command is read', () => {
      then('a shell IS used — node refuses to spawn a .cmd without one', () => {
        expect(
          asPnpmVersionProbeCommand({ platform: 'win32' }).options.shell,
        ).toEqual(true);
      });
    });
  });
});
