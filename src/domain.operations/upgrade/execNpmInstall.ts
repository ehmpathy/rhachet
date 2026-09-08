import {
  asNpmInstallFailureKind,
  type NpmInstallFailureKind,
} from './asNpmInstallFailureKind';
import {
  asNpmInstallShellPresence,
  type NpmInstallShellPresence,
} from './asNpmInstallShellPresence';
import { spawnNpmInstall } from './spawnNpmInstall';

// re-exported so the extant callers and clamps that read the bound from here still do.
// ⚠️ its OWNER is `spawnNpmInstall`, the operation that applies it — this is a pointer
export { INSTALL_TIMEOUT_MS } from './spawnNpmInstall';

/**
 * .what = which install a run targets — the project's own tree, or the global one
 * .why  = the two differ ONLY in the arg vector and the header they print. every other
 *   step — capture, replay, classify — is identical, and used to be written twice
 */
export type NpmInstallTarget = 'local' | 'global';

/**
 * .what = whether an install runs the lifecycle hooks its dependencies declare
 *
 * .why  = REQUIRED, never defaulted (`rule.forbid.undefined-inputs`). a default is
 *   inherited by the next native dependency added, whose addon then never builds — the
 *   node-pty defect exactly. with no default there is naught to inherit: the type refuses
 *   to compile until a caller names a value.
 *
 * ⚠️ `skip` maps to `--ignore-scripts`, which is NOT pnpm's build gate — the gate is the
 *   consumer's policy and their allowlist lifts it; this flag overrides them both.
 */
export type NpmInstallLifecycleHooks = 'run' | 'skip';

/**
 * .what = did spawnSync kill this child at its TIME BOUND, as opposed to a signal death
 *   the child took for a reason of its own?
 *
 * .why  = `spawnSync` sets BOTH `result.error` and `result.signal` on a timeout kill AND
 *   on any other signal death — a segfault, an OOM kill, an abort. so that pair alone
 *   reports a CRASHED package manager as a stalled one, and hands its human *"check your
 *   network, then retry"* over a cause the network cannot explain.
 *
 * ⚠️ node stamps `code = 'ETIMEDOUT'` on the bound kill ALONE, so the code is the read.
 *   every other signal death falls to the structural row below.
 */
const isSpawnTimeoutError = (error: Error | undefined): boolean =>
  error !== undefined && (error as NodeJS.ErrnoException).code === 'ETIMEDOUT';

/**
 * .what = the outcome of one package-manager install, with its cause CLASSIFIED
 * .why  = a caller must branch on a structured value, never on prose it did not produce.
 *   a text match against someone else's message is a contract nobody declared, so it rots
 *   the moment that message is reworded
 */
export interface NpmInstallOutcome {
  /**
   * .what = the classified cause, or null when the install exited 0
   * .why  = null rather than an 'ok' member, so *did it fail* and *why* stay separable
   */
  kind: NpmInstallFailureKind | null;
  exitCode: number | null;
  output: string;
  /**
   * .what = whether a shell sat between us and the package manager on this run
   *
   * .why  = the `timed-out` sentence cannot be written truthfully without it — the bound
   *   kills the child WE spawned, and with a shell that child is the SHELL, so *"the
   *   package manager was killed"* is false on exactly those hosts.
   *
   * ⚠️ it rides the outcome rather than a re-read of `process.platform` by each caller.
   *   the run that produced the outcome is the only party that knows how it was spawned.
   */
  shellPresence: NpmInstallShellPresence;
}

/**
 * .what = the arg vector for one target
 * .why  = the ONLY real difference between the two installs, so it is held in one place
 *   rather than inlined at two call sites free to drift
 *
 * ⚠️ holds no policy of its own — `lifecycleHooks` arrives from the caller and is applied
 *   verbatim (see `NpmInstallLifecycleHooks`).
 */
const asNpmInstallArgs = (input: {
  packageManager: 'pnpm' | 'npm';
  target: NpmInstallTarget;
  packagesLatest: string[];
  lifecycleHooks: NpmInstallLifecycleHooks;
}): string[] => {
  // .note = one owner for the flag, so the two targets cannot drift into two policies.
  //   both package managers spell it identically
  const argsHooks = input.lifecycleHooks === 'skip' ? ['--ignore-scripts'] : [];

  if (input.target === 'local')
    return ['install', ...argsHooks, ...input.packagesLatest];

  // pnpm spells a global add differently from npm
  if (input.packageManager === 'pnpm')
    return ['add', '-g', ...argsHooks, ...input.packagesLatest];

  return ['install', '-g', ...argsHooks, ...input.packagesLatest];
};

/**
 * .what = prints what is about to be installed, as a treestruct
 * .why  = one owner for the header, so the two targets cannot drift into two formats
 *
 * .note = `📦` is a REGISTERED domain-root, not a bespoke pick. `rhx upgrade` is rhachet's own
 *   cli, so it takes a neutral glyph rather than a role mascot — but the neutral slots cannot
 *   root a tree (`⚠️`/`💡` are callouts, `✨`/`🫧` are leaves), and no extant root covers this
 *   domain. so the glyph is entered in the inventory with its why, per that brief's own
 *   conform-or-register instruction (`rule.prefer.emoji-language`). the inventory is the owner;
 *   this note points at it rather than restates the reason.
 */
const printNpmInstallPlan = (input: {
  packageManager: 'pnpm' | 'npm';
  target: NpmInstallTarget;
  packagesLatest: string[];
}): void => {
  // .note = `suffixGlobal`, never `scope` — `scope` would be a synonym of `target`,
  //   which already names this axis two lines up (term=target, sense B)
  const suffixGlobal = input.target === 'global' ? ' -g' : '';

  console.log('');
  console.log(`📦 upgrade (${input.packageManager}${suffixGlobal})`);
  input.packagesLatest.forEach((pkg, index) => {
    const isLast = index === input.packagesLatest.length - 1;
    console.log(`   ${isLast ? '└──' : '├──'} ${pkg}`);
  });
  console.log('');
};

/**
 * .what = bridges the package manager's red ERR text to the clean success that follows it
 *
 * .why  = a gated build hook renders as a CONTRADICTION on the human's screen: the install
 *   replays pnpm's `ERR_PNPM_IGNORED_BUILDS` block verbatim, and both callers then return
 *   a plain success. with no line between the two, a human is left to guess which to
 *   believe (`rule.require.status-feedback`).
 *
 * ⚠️ it names NO cure. `pnpm approve-builds -g` lifts the gate, and to name it would imply
 *   the human SHOULD — over a condition that costs them no capability at all.
 * ⚠️ UNREACHABLE at both production call sites today: the global path exits 0 at both pnpm
 *   majors, and the local path passes `--ignore-scripts`. it is held against the day the
 *   opt-out is removed.
 */
export const printNpmInstallGateNote = (): void => {
  console.log('');
  console.log(
    '✨ upgrade complete — the ERR above is a gate notice, not a failure',
  );
  console.log(
    '   ├── a dependency declares a build hook, and your package manager gated it',
  );
  console.log('   └── every package installed; only that hook was skipped');
  console.log('');
};

/**
 * .what = PRINTS the plan, runs one package-manager install, REPLAYS what it said, and
 *   reports its outcome, classified
 *
 * .why  = both upgrade targets need the identical sequence, and written twice the two
 *   drifted: the global path learned to tell a permission wall from a gated build hook,
 *   and the local path still called every nonzero exit a failure.
 *
 * 🚨 the WRITES are part of the contract, never a hidden side effect — this returns an
 *   `NpmInstallOutcome` AND writes to `process.stdout` / `process.stderr`
 *   (`rule.forbid.hidden-side-effects`). so `outcome.output` holds bytes ALREADY WRITTEN,
 *   and a caller that renders them again double-prints. callers render sentences, never
 *   bytes.
 *
 * ⚠️ the raw i/o lives in `spawnNpmInstall`, never here. this composes: print the plan,
 *   run the communicator, dispatch the extant classifiers
 *   (`define.domain-operation-grains`).
 * ⚠️ a nonzero exit does NOT prove the install failed. pnpm >= 11 exits nonzero on
 *   ERR_PNPM_IGNORED_BUILDS even when every package installed, so the caller is handed a
 *   kind rather than a verdict.
 * ⚠️ output is CAPTURED and replayed rather than inherited. `stdio: 'inherit'` streams live
 *   but leaves no bytes to classify, which forces a text match against our own thrown
 *   prose — a contract nobody declared. the trade costs live progress on a short command.
 */
export const execNpmInstall = (
  input: {
    packageManager: 'pnpm' | 'npm';
    target: NpmInstallTarget;
    packagesLatest: string[];
    /**
     * .what = whether to run the lifecycle hooks the installed packages declare
     * .why  = REQUIRED, never defaulted. a default here is precisely the hazard this field
     *   exists to retire — see `NpmInstallLifecycleHooks`
     */
    lifecycleHooks: NpmInstallLifecycleHooks;
    /**
     * .what = where to run, or null to inherit this process's cwd
     * .why  = a global install belongs to no project, so it has no directory to name. null
     *   states that outright rather than leaves the field absent
     *   (rule.forbid.undefined-inputs)
     */
    cwd: string | null;
  },
  options?: {
    /**
     * .what = the communicator this orchestrator drives
     * .why = `execNpmInstall` is an ORCHESTRATOR: it prints the plan, runs one communicator,
     *   and dispatches the extant classifiers. every one of those is pure but the middle, so
     *   a seam there makes the whole composition provable with no boundary crossed and no
     *   mock (`rule.forbid.unit.remote-boundaries`, `define.domain-operation-grains`).
     *
     * .note = the DEFAULT is the only value production uses, as with `getPnpmPresence`'s
     *   `probe` and `getPtyModuleOrNull`'s `load`. the real spawn is exercised at the
     *   integration tier, where it belongs.
     */
    spawn?: typeof spawnNpmInstall;
  },
): NpmInstallOutcome => {
  const spawn = options?.spawn ?? spawnNpmInstall;

  printNpmInstallPlan(input);

  // 🚨 ONE owner for the shell decision, read once and carried on the outcome. it is the
  //   same fact twice — the spawn option below, and the truthfulness of the timeout
  //   sentence downstream — so it must not be computed twice
  const shellPresence = asNpmInstallShellPresence({
    platform: process.platform,
  });

  const result = spawn({
    packageManager: input.packageManager,
    args: asNpmInstallArgs(input),
    cwd: input.cwd,
    shellPresence,
  });

  const output = result.output;

  // 🚨 a timeout is known STRUCTURALLY, never from the output — a child killed at its
  //   bound names no cause in the bytes it managed to write, so the text classifier would
  //   read it as `unclassified` and tell the human we do not know. we do know.
  //   `isSpawnTimeoutError` owns why the code, and not the error/signal pair, is the read
  if (isSpawnTimeoutError(result.error))
    return {
      kind: 'timed-out',
      exitCode: result.status,
      output,
      shellPresence,
    };

  // 🚨 ANY other death-without-an-exit is settled STRUCTURALLY too, and it MUST be read
  //   before the text classifier. a segfaulted package manager writes no error code, so
  //   if pnpm printed its `ERR_PNPM_IGNORED_BUILDS` notice before it died, that notice
  //   stands ALONE in the captured bytes — and a notice that stands alone classifies as
  //   `build-gate-blocked`, which `execNpmInstallGlobal` ABSOLVES as `{ upgraded: true }`.
  //   a crashed package manager, reported as a successful upgrade (`rule.forbid.failhide`)
  //
  //   `signal` covers a kill (SIGSEGV, SIGKILL, an OOM); `error` covers a spawn that never
  //   started (ENOENT on an absent package manager). neither names a cause in bytes it
  //   never wrote, so `unclassified` is the honest kind
  if (result.signal !== null || result.error !== undefined)
    return {
      kind: 'unclassified',
      exitCode: result.status,
      output,
      shellPresence,
    };

  // a zero exit needs no cause, so none is invented for it
  if (result.status === 0)
    return { kind: null, exitCode: result.status, output, shellPresence };

  return {
    kind: asNpmInstallFailureKind({ output }),
    exitCode: result.status,
    output,
    shellPresence,
  };
};
