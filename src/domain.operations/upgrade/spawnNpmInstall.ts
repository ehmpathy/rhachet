import { spawnSync } from 'node:child_process';
import type { NpmInstallShellPresence } from './asNpmInstallShellPresence';
import { asNpmInstallSpawnOptions } from './asNpmInstallSpawnOptions';

// re-exported so the extant callers and clamps that read the bound from here still do.
// ⚠️ its OWNER is `asNpmInstallSpawnOptions`, the transformer that applies it — this is a
//   pointer, never a second declaration
export { INSTALL_TIMEOUT_MS } from './asNpmInstallSpawnOptions';

/**
 * .what = what the package manager did, in the terms `spawnSync` reports it — plus the
 *   bytes it wrote, already replayed to the human
 *
 * ⚠️ `status`, `signal` and `error` are carried SEPARATELY rather than pre-judged. each
 *   settles a different cause structurally, and a classifier that saw only an exit code
 *   would read a segfault as a text-classifiable failure.
 */
export interface NpmInstallSpawnResult {
  /** the exit code, or null when the child died without one */
  status: number | null;
  /** the signal that killed it, or null */
  signal: NodeJS.Signals | null;
  /** a spawn-level fault (an absent binary, a bound kill), or undefined */
  error: Error | undefined;
  /** both streams joined — a cause can arrive on either */
  output: string;
}

/**
 * .what = both of the package manager's streams, joined into one string
 * .why  = a cause can arrive on either — pnpm writes its gate notice to stderr, npm its
 *   permission wall to stdout — so the classifier must read BOTH.
 */
const asNpmInstallOutput = (input: {
  stdout: string | null;
  stderr: string | null;
}): string => `${input.stdout ?? ''}${input.stderr ?? ''}`;

/**
 * .what = the raw i/o boundary to the package manager — run it, stream what it says to the
 *   human, and hand back both the bytes and the structural outcome
 *
 * 🚨 capture AND replay, never `stdio: 'inherit'`. inherit streams live but leaves no bytes
 *   to classify, which forces a text match against our own thrown prose — a contract nobody
 *   declared. the trade costs live progress on a short command, and it is what makes a
 *   structured `NpmInstallOutcome` possible at all.
 *
 * ⚠️ the replay lands BEFORE any verdict is formed, on purpose — a killed install still
 *   wrote bytes up to the moment it stalled, and those bytes are the best evidence of WHERE
 *   (`rule.forbid.failhide`).
 *
 * ⚠️ THIS is the only path by which the package manager's log reaches a terminal. a caller
 *   reads `output` to CLASSIFY and prints only sentences it composed itself; to render
 *   these bytes again double-prints them.
 */
export const spawnNpmInstall = (input: {
  packageManager: 'pnpm' | 'npm';
  args: string[];
  /** where to run, or null to inherit this process's cwd */
  cwd: string | null;
  /** whether a shell must sit between us and the package manager on this host */
  shellPresence: NpmInstallShellPresence;
}): NpmInstallSpawnResult => {
  // 🚩 the ORPHAN is open — a cure needs a detached process-group kill that `spawnSync`
  //   cannot express, so it needs `spawn` plus a group. it sits outside this wish's bound
  //   (linux). what IS closed is the report: `shellPresence` rides the outcome, so
  //   `asNpmInstallFailureError` never claims we killed a process we did not
  //   (`rule.forbid.failhide`). the options themselves, and why each is what it is, are
  //   owned by `asNpmInstallSpawnOptions`
  const result = spawnSync(
    input.packageManager,
    input.args,
    asNpmInstallSpawnOptions(input),
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    status: result.status,
    signal: result.signal,
    error: result.error,
    output: asNpmInstallOutput(result),
  };
};
