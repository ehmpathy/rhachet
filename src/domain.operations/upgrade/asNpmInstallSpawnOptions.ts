import type { NpmInstallShellPresence } from './asNpmInstallShellPresence';

/**
 * .what = the wall-clock bound on one package-manager install
 *
 * .why  = `spawnSync` BLOCKS, so with no bound a stalled registry holds the human's
 *   terminal for as long as the child lives (`rule.forbid.behavior-hazards`).
 *
 * .why 300_000 = a cold install of rhachet plus its role packages over a slow link takes
 *   minutes, so a tighter bound would kill healthy installs. the clamp reads this same
 *   constant, so a test can never hold a bound production does not.
 */
export const INSTALL_TIMEOUT_MS = 300_000;

/**
 * .what = the `spawnSync` options one install run carries, as data
 *
 * .why  = these are a POLICY — the character set, whether a shell, what bound, which
 *   directory — and a policy asserted only through a mocked spawn is asserted against the
 *   mock. as data it is a pure value a unit row reads directly, with no boundary crossed and
 *   no mock (`rule.forbid.unit.remote-boundaries`). mirrors `asPnpmVersionProbeCommand`, the
 *   same move already proven on the probe.
 *
 * 🚨 `shell` and `timeout` are load-bearing TOGETHER: under `shell: true` node spawns
 *   `sh -c "pnpm add -g …"`, so the bound kills the SHELL and the package manager beneath it
 *   is orphaned — still alive, still holds its store lock. the timeout sentence downstream is
 *   truthful only while `shell` is false, which is why `shellPresence` rides the outcome.
 *
 * ⚠️ win32 is the exception, never a preference: `pnpm`/`npm` are `.cmd` shims there, which
 *   node cannot spawn without a shell. that platform keeps the orphan hazard.
 * ⚠️ `cwd` is OMITTED rather than passed as null — `null` and an absent key are different
 *   asks of `spawnSync`, and only the second inherits this process's directory.
 */
export const asNpmInstallSpawnOptions = (input: {
  shellPresence: NpmInstallShellPresence;
  /** where to run, or null to inherit this process's cwd */
  cwd: string | null;
}): {
  encoding: 'utf8';
  shell: boolean;
  timeout: number;
  cwd?: string;
} => ({
  encoding: 'utf8',
  shell: input.shellPresence === 'present',
  timeout: INSTALL_TIMEOUT_MS,
  ...(input.cwd === null ? {} : { cwd: input.cwd }),
});
