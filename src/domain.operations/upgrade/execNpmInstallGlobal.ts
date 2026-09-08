import { assertNpmInstallSucceeded } from './assertNpmInstallSucceeded';
import { execNpmInstall } from './execNpmInstall';
import {
  asProbeTimeoutWords,
  getPnpmPresence,
  type PnpmPresenceRead,
} from './getPnpmPresence';
import { printPnpmPresenceUnreadableNotice } from './printPnpmPresenceUnreadableNotice';

/**
 * .what = which package manager a global install runs, given what the probe established
 * .why  = `unreadable → npm` is a policy, not a formality: an unread probe is no reason to
 *   refuse an upgrade npm can perform. its VISIBILITY is the caller's job, above.
 */
const asPackageManagerFromPresence = (input: {
  presence: PnpmPresenceRead;
}): 'pnpm' | 'npm' => (input.presence === 'present' ? 'pnpm' : 'npm');

/**
 * .what = executes global install for specified packages
 * .why = enables upgrade of global rhachet install
 *
 * .note = uses pnpm if available, falls back to npm
 *
 * .note = it throws on a nonzero exit it cannot absolve, and the CLASS of that throw
 *   carries who must act — `asNpmInstallFailureError` casts a permission wall to a
 *   ConstraintError (exit 2, the caller's) and every other cause to a MalfunctionError
 *   (exit 1, ours or transient). an earlier note here said "fails fast on EACCES/EPERM",
 *   which named one row of four and implied the rest were silent.
 *
 * .note = the run, the replay, and the classification all belong to `execNpmInstall`;
 *   the three-row read of the outcome, and the throw it may raise, belong to
 *   `assertNpmInstallSucceeded`; the package-manager probe belongs to `getPnpmPresence`,
 *   which owns its own bound, its retry, and its tri-state. the local target shares all
 *   three. this operation owns only what is global-specific: what to DO with the probe's
 *   answer, and the `{ upgraded }` shape it returns
 */
export const execNpmInstallGlobal = (
  input: {
    packages: string[];
  },
  options?: {
    /**
     * .what = the package-manager probe this operation composes
     * .why = a REAL probe shells out, so a unit row that drives it must either cross that
     *   boundary or `jest.mock('node:child_process')` — and the second is the mock
     *   antipattern (`rule.forbid.unit.remote-boundaries`). the seam lets the composition
     *   be proven with a typed fake, while the real probe runs at the integration tier
     */
    probe?: typeof getPnpmPresence;

    /**
     * .what = the install run this operation composes
     * .why = same seam, same reason — this operation owns WHAT to do with the probe's
     *   answer, never how the install itself runs. `execNpmInstall` owns that, and has
     *   its own clamps
     */
    install?: typeof execNpmInstall;
  },
): { upgraded: boolean } => {
  const probe = options?.probe ?? getPnpmPresence;
  const install = options?.install ?? execNpmInstall;

  const packagesLatest = input.packages.map((p) => `${p}@latest`);

  // detect package manager: prefer pnpm
  const presence = probe();

  // 🚨 an UNREADABLE probe is surfaced, never swallowed into the fallback.
  //
  //   we still proceed on npm — a wedged probe is no reason to refuse an upgrade npm can
  //   perform, and to throw here would turn a host anomaly into a hard failure on a path
  //   that works. but the human must SEE it, because the two ways to reach npm are not the
  //   same event: "you have no pnpm" is ordinary, while "your PATH never answered"
  //   is a host fault that will bite them again elsewhere.
  //
  //   ⚠️ to print naught here is the failhide. they would watch npm start, and if npm then
  //   failed they would debug npm — with no trace of the hung probe that redirected them
  //   (`rule.forbid.failhide`, `rule.require.errors-name-the-fix`).
  if (presence === 'unreadable')
    printPnpmPresenceUnreadableNotice({ timeoutWords: asProbeTimeoutWords() });

  const pm = asPackageManagerFromPresence({ presence });

  const outcome = install({
    packageManager: pm,
    target: 'global',
    packagesLatest,
    // .why 'run' = the global target has NEVER passed `--ignore-scripts`, and that is the
    //   correct policy rather than an oversight: a global install is the human's own
    //   store, so their package manager's build gate — and their allowlist — is the
    //   authority on which hooks run. we do not override it. stated explicitly now that
    //   the field is required, so the asymmetry between the two targets is a declared
    //   position rather than a difference a reader must infer from two arg vectors
    lifecycleHooks: 'run',
    // a global install belongs to no project, so it runs where this process runs
    cwd: null,
  });

  // throws on a cause it cannot absolve; returns on a clean exit or an absolved build gate
  assertNpmInstallSucceeded({
    outcome,
    target: 'global',
    packageManager: pm,
    packages: input.packages,
  });

  return { upgraded: true };
};
