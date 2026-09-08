import { asNpmInstallFailureError } from './asNpmInstallFailureError';
import {
  type NpmInstallOutcome,
  type NpmInstallTarget,
  printNpmInstallGateNote,
} from './execNpmInstall';

/**
 * .what = throws when an install outcome names a real failure; returns when it does not
 *
 * .why  = both targets read the SAME three rows off an outcome — a clean exit, an absolved
 *   build gate, a failure — and the throw carries six fields that must stay in lockstep.
 *   written twice, the two drifted once already.
 *
 * ⚠️ two call sites, and it stays extracted: `NpmInstallTarget` is a CLOSED two-member
 *   union. the rule of three hedges against unknown future growth, and no third install
 *   target can exist, so the heuristic does not reach this case
 *   (`rule.prefer.wet-over-dry`).
 * ⚠️ it holds NO target-conditional logic — `target` is data it forwards to the error,
 *   never a branch. the two callers differ only in what they return, which stays theirs.
 */
export const assertNpmInstallSucceeded = (input: {
  outcome: NpmInstallOutcome;
  target: NpmInstallTarget;
  packageManager: 'pnpm' | 'npm';
  packages: string[];
}): void => {
  // a clean exit needs no account
  if (input.outcome.kind === null) return;

  // 🚨 THE ONE NONZERO EXIT WE ABSOLVE, and it is a guard rather than a default.
  //   a gated build hook is not a failure — the packages installed, and only a
  //   lifecycle hook was skipped. pnpm delivers that notice through the exit code,
  //   so to rethrow it would report a defect that does not exist.
  //
  //   .why not a failhide = the absolution is EARNED upstream, never assumed here.
  //     `asNpmInstallFailureKind` returns this row only when the notice stands
  //     ALONE — a real failure beside it classifies as `unclassified` and reaches
  //     the throw below (`[case5]`). so this line trusts a proven fact, and the
  //     proof is a clamp rather than a comment (`rule.forbid.failhide`).
  //
  //   .why the same shape as a clean exit = because it IS one, to a caller. the
  //     packages landed; the caller's question is "may i proceed?", and the honest
  //     answer is yes. a distinct return member would ask every caller to branch
  //     on a distinction none of them can act on
  //     (`rule.require.fewer-paths-via-idempotency`).
  //
  //   .note = the human still SEES the notice — `execNpmInstall` replays the
  //     package manager's whole output before it classifies, so no byte is hidden
  //     from them; only the exit code is reinterpreted. the printed note is what turns
  //     that from a half-truth into the whole one: they saw pnpm's ERR block, and with
  //     no line after it the screen read as a contradiction — red error, then bare
  //     success (`rule.require.status-feedback`)
  //
  //   .note = ⚠️ REACHABLE THROUGH THE CONTRACT, unreachable from either production call
  //     site today. `lifecycleHooks` is a required input, so any caller may pass `'run'`
  //     and let pnpm's gate decide — but the global path exits 0 at both pnpm majors, and
  //     `execUpgrade` passes `'skip'` to the local one. that makes it a live-but-unexercised
  //     row: a future change to that one argument would activate it with no production
  //     signal that it had ever been tried.
  //
  //     ✅ so it is CLAMPED rather than merely explained — `execNpmInstallLocal.test.ts`
  //     and `execNpmInstallGlobal.test.ts` each force the row live at their own target. the
  //     branch is kept because the contract admits it, and the clamp is what makes "kept
  //     for tomorrow" a checked claim rather than a hope.
  if (input.outcome.kind === 'build-gate-blocked') {
    printNpmInstallGateNote();
    return;
  }

  throw asNpmInstallFailureError({
    kind: input.outcome.kind,
    target: input.target,
    packageManager: input.packageManager,
    exitCode: input.outcome.exitCode,
    output: input.outcome.output,
    packages: input.packages,
    // read off the OUTCOME, never re-derived here — the run that spawned the child is the
    // one party that knows whether a shell was interposed
    shellPresence: input.outcome.shellPresence,
  });
};
