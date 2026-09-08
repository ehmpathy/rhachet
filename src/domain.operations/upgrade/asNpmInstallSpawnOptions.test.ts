import { given, then, when } from 'test-fns';

import {
  asNpmInstallSpawnOptions,
  INSTALL_TIMEOUT_MS,
} from './asNpmInstallSpawnOptions';

/**
 * 🚨 ZERO mocks, and that is the whole point of this file's existence.
 *
 *   these four options were previously clamped ONLY through
 *   `jest.mock('node:child_process')` in `execNpmInstallGlobal.test.ts`, read off
 *   `mockSpawnSync.mock.calls[n][2]`. so the policy was asserted against the mock's own
 *   record, three layers above the operation that sets it
 *   (`rule.forbid.unit.remote-boundaries`).
 *
 *   as a transformer the same policy is a pure value, so each row below reads it directly.
 */
describe('asNpmInstallSpawnOptions', () => {
  given('[case1] a host that needs no shell between us and the binary', () => {
    when('[t0] the options are shaped', () => {
      then('no shell is asked for', () => {
        // 🚨 the clamp on the ORPHAN hazard. under `shell: true` the bound kills the
        //   `sh -c` wrapper and the package manager beneath it survives, which still holds
        //   its store lock — and `asNpmInstallFailureError`'s timeout sentence then claims
        //   we killed a process we did not (`rule.forbid.failhide`).
        //   .the mutation that reddens this: hardcode `shell: true`
        expect(
          asNpmInstallSpawnOptions({ shellPresence: 'absent', cwd: null })
            .shell,
        ).toBe(false);
      });

      then('the wall-clock bound rides with it', () => {
        // 🚨 `spawnSync` BLOCKS, so an install with no bound holds a human's terminal for
        //   as long as the child lives (`rule.forbid.behavior-hazards`).
        //
        //   .why the CONSTANT, never a literal `300_000` = the property is *"production's
        //     bound reaches the spawn"*, never *"the bound is five minutes"*
        expect(
          asNpmInstallSpawnOptions({ shellPresence: 'absent', cwd: null })
            .timeout,
        ).toEqual(INSTALL_TIMEOUT_MS);
      });

      then('the streams are decoded as text, never left as buffers', () => {
        // .why = every downstream classifier reads `output` as a string; a buffer would
        //   stringify to `[object Object]` and classify as `unclassified` on every failure
        expect(
          asNpmInstallSpawnOptions({ shellPresence: 'absent', cwd: null })
            .encoding,
        ).toEqual('utf8');
      });
    });
  });

  given('[case2] a host where the binary is a shim node cannot spawn', () => {
    when('[t0] the options are shaped', () => {
      then('a shell IS asked for, orphan hazard and all', () => {
        // ⚠️ win32 is the exception, never a preference: `pnpm`/`npm` are `.cmd` shims
        //   there. the presence is an INPUT rather than an ambient `process.platform` read,
        //   so this row runs identically on every host that runs the suite
        expect(
          asNpmInstallSpawnOptions({ shellPresence: 'present', cwd: null })
            .shell,
        ).toBe(true);
      });

      then('the bound is unchanged by the shell decision', () => {
        // .why = a cure that dropped the bound wherever a shell sits between us would
        //   leave exactly the hosts with the orphan hazard also unbounded
        expect(
          asNpmInstallSpawnOptions({ shellPresence: 'present', cwd: null })
            .timeout,
        ).toEqual(INSTALL_TIMEOUT_MS);
      });
    });
  });

  given('[case3] the directory the install runs in', () => {
    when(
      '[t0] a null cwd — a global install, which belongs to no project',
      () => {
        then('the key is ABSENT, never present-and-null', () => {
          // 🚨 `null` and an absent key are different asks of `spawnSync`: only the second
          //   inherits this process's directory, and `cwd: null` is a type error node
          //   tolerates by coercion. so `toBeUndefined` would pass on either — the read is
          //   for the KEY (`rule.require.clamp-edge-cases`)
          const options = asNpmInstallSpawnOptions({
            shellPresence: 'absent',
            cwd: null,
          });
          expect('cwd' in options).toBe(false);
        });
      },
    );

    when('[t1] a real cwd — a local install, in a project tree', () => {
      then('it is carried through verbatim', () => {
        expect(
          asNpmInstallSpawnOptions({
            shellPresence: 'absent',
            cwd: '/tmp/project',
          }).cwd,
        ).toEqual('/tmp/project');
      });
    });
  });
});
