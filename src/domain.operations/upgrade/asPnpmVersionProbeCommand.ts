import { asNpmInstallShellPresence } from './asNpmInstallShellPresence';

/**
 * .what = how long a package-manager presence probe may block before we call it hung
 *
 * ⚠️ NOT sized to the work — `pnpm --version` returns in well under a second. it is ~100x
 *   that, so it fires only on the pathological case: a PATH entry on a wedged mount, which
 *   with no bound hangs the upgrade forever (`rule.forbid.time-assumptions`).
 */
export const PROBE_TIMEOUT_MS = 10_000;

/**
 * .what = the exact command the pnpm presence probe spawns, as data
 * .why = the command is a POLICY — which binary, which flags, whether a shell, what bound —
 *   and a policy asserted only through a mocked spawn is asserted against the mock. as data
 *   it is a pure value a unit test reads directly, with no boundary crossed and no mock
 *   (`rule.forbid.unit.remote-boundaries`).
 *
 * ⚠️ the DASHES are load-bearing: `pnpm --version` is a pure read and so re-runnable, where
 *   `pnpm version` bumps package.json and can tag — a probe that mutates the repo, and one
 *   the caller's retry would then run twice.
 *
 * 🚨 `shell` and `timeout` are load-bearing TOGETHER: under `shell: true` the bound kills the
 *   `sh -c` wrapper and ORPHANS pnpm beneath it, which stays alive and holds its store lock —
 *   and the probe retries, so an unconditional shell could strand two. win32 is the one
 *   exception, where `pnpm` is a `.cmd` shim node refuses to spawn without one.
 */
export const asPnpmVersionProbeCommand = (input: {
  platform: NodeJS.Platform;
}): {
  command: string;
  args: string[];
  options: { stdio: 'pipe'; shell: boolean; timeout: number };
} => ({
  // 🚨 `pnpm` ITSELF, never a lookup binary — a PATH lookup answers *"is there a file named
  //   pnpm"*; a run of pnpm answers *"can i run pnpm"*, and only the second is the caller's
  //   question. a corrupt shim is found on PATH and then fails when invoked
  command: 'pnpm',
  args: ['--version'],
  options: {
    stdio: 'pipe',
    shell:
      asNpmInstallShellPresence({ platform: input.platform }) === 'present',
    timeout: PROBE_TIMEOUT_MS,
  },
});
