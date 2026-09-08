/**
 * .what = whether a shell sits between this process and the package manager it spawns
 *
 * .why  = 🚨 it decides whether the timeout sentence may say *"was killed"* about the
 *   package manager AT ALL. `spawnSync`'s `timeout` kills the child it spawned — and with
 *   a shell present, that child is the SHELL. the package manager beneath it is orphaned:
 *   still alive, still holding its store lock, still writing into a pipe no one reads.
 *
 *   so *"pnpm global install exceeded its bound and was killed"* is a **structurally false
 *   sentence** on a host with a shell — false about the one process that actually hung, and
 *   confidently so. that is the defect class this whole change exists to retire, reproduced
 *   inside the report meant to retire it (`rule.forbid.failhide`).
 *
 *   this datum is what lets the sentence say the true thing on both hosts instead.
 *
 * .why a presence pair, not a boolean = `present`/`absent` is the vocabulary this directory
 *   already speaks — `PnpmPresenceRead` in `execNpmInstallGlobal` reads exactly that way. a
 *   bare boolean at the call site would read `shell: true`, which does not say WHOSE
 *   presence is meant (`rule.forbid.ambiguous-labels`), and `absent` is this repo's declared
 *   word for *not there* (`term=absent`).
 *
 * .why pure, with the platform as an INPUT = the win32 row is the ONLY row that matters
 *   here, and no runner we own is win32. an ambient `process.platform` read inside would
 *   leave it untestable by construction rather than by choice — a claim about a platform,
 *   verified nowhere. the same shape, and the same reason, as `getPtyPlatformSupport` in
 *   `clone/pty`.
 *
 * .note = win32 is not a preference. `pnpm` and `npm` are `.cmd` shims there, which node
 *   refuses to spawn without a shell, so that platform cannot opt out of the orphan hazard.
 *   the hazard is therefore REPORTED honestly rather than cured — a cure needs a detached
 *   process-group kill, which `spawnSync` cannot express at all.
 */
export type NpmInstallShellPresence = 'present' | 'absent';

export const asNpmInstallShellPresence = (input: {
  platform: string;
}): NpmInstallShellPresence =>
  input.platform === 'win32' ? 'present' : 'absent';
