import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = the exact dirs THIS process created, so exit can remove them
 * .why = the cleanup below must be scoped to paths this process owns by construction —
 *        each is a value `mkdtempSync` handed back here, never a glob or a name pattern.
 *        a pattern would match a peer run's dir on a shared box; a list of owned paths
 *        cannot (`rule.forbid.unscoped-process-kills` names the same hazard for processes)
 */
const pathsOwned: string[] = [];

/**
 * .what = remove every dir this process created, once — idempotent, safe to call twice
 * .why = `exit` alone is not enough: node runs `exit` handlers on a normal end, and on an
 *        UNCAUGHT signal it does not run them at all. a ctrl-c mid-run is the common case
 *        for a suite this long, and it leaked one dir per spawn — of which this wish's own
 *        suite makes many hundreds
 * .note = `force: true` so an already-removed dir is a no-op — a test may clean up its own,
 *         and a teardown that throws on a tidy tree would fail a green run
 */
const purgePathsOwned = (): void => {
  // .note = splice, so a second call (signal then exit) finds an empty list rather than a
  //         second pass over paths already gone
  for (const path of pathsOwned.splice(0, pathsOwned.length))
    rmSync(path, { recursive: true, force: true });
};

/**
 * .what = register the purge on a normal exit AND on the signals that skip `exit`
 * .why = `SIGINT` (ctrl-c) and `SIGTERM` (a killed run, a ci cancel) terminate the process
 *        without an `exit` event unless a listener exists. with one, node runs the handler —
 *        so the purge re-raises an explicit `process.exit` that preserves the exit code a
 *        caller reads (128 + signal), rather than a silent success
 * ⚠️ .why.re-raise = a handler that swallows the signal turns a ctrl-c into a hang; the
 *        explicit exit is what keeps the interrupt an interrupt
 *
 * ⚠️ .why.truncation-accepted = `process.exit` does NOT drain queued stdout, so a suite that was
 *        mid-`console.log` when the signal arrived loses the tail of its own report. that is a
 *        DELIBERATE trade, not an oversight: the alternative — `process.exitCode` plus a return,
 *        which the cli path uses — cannot work here, because a signal handler that merely SETS an
 *        exit code leaves the process alive and the interrupt unhonored. so this handler must
 *        exit, and to exit is to truncate.
 * .note = the trade is cheap in exactly this spot and nowhere else: an interrupted run is one a
 *         human just abandoned and is about to re-run, so the cost is a partial report on a
 *         result nobody wanted. the cost of the alternative is a ctrl-c that does not stop the
 *         suite, plus every temp dir it owns left behind on the box
 */
let cleanupRegistered = false;
const registerCleanupOnce = (): void => {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.on('exit', purgePathsOwned);
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, () => {
      purgePathsOwned();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    });
};

/**
 * .what = create an isolated temp dir that is NOT a git repo
 * .why =
 *   - some paths must be exercised from a cwd OUTSIDE any git repo (e.g. a git
 *     credential helper invoked from an arbitrary clone, or a non-repo dir) — the
 *     rhx CLI-wide bootstrap must tolerate a non-repo cwd (see
 *     rule.require.cli-tolerates-non-repo-cwd)
 *   - genTestTempRepo git-inits its dir, so it is a repo and cannot serve this case;
 *     this helper is its non-repo twin — the same os.tmpdir() isolation root, minus
 *     the git init — so tests do not inline mkdtempSync ad hoc
 *
 * ⚠️ .note.cleanup = the dir is removed on process exit AND on `SIGINT`/`SIGTERM`, by this
 *         helper. it is NOT removed by the OS: linux and macos prune `/tmp` on a schedule (or
 *         on boot), never on process exit — so a helper that claimed "the OS handles it" would
 *         leak one dir per spawn, and this suite spawns the cli many hundreds of times per run
 */
export const genTestTempDirNonRepo = (input?: {
  /** optional label woven into the dir name for legibility in a failure trace */
  label?: string;
}): { path: string } => {
  const prefix = input?.label ? `${input.label}-` : 'non-git-cwd-';
  const path = mkdtempSync(join(tmpdir(), prefix));

  registerCleanupOnce();
  pathsOwned.push(path);

  return { path };
};
