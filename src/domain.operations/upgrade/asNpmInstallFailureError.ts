import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { NpmInstallFailureKind } from './asNpmInstallFailureKind';
import type { NpmInstallShellPresence } from './asNpmInstallShellPresence';
import { INSTALL_TIMEOUT_MS, type NpmInstallTarget } from './execNpmInstall';

/**
 * .what = the install bound, as the words the timeout sentence shows a human
 * .why  = DERIVED from the constant `execNpmInstall` declares, never hard-typed beside
 *   it. a widened bound would otherwise leave the sentence with the old figure, and a
 *   human whose install died at ten minutes would read that it died at five.
 */
const asInstallTimeoutWords = (): string =>
  `${Math.round(INSTALL_TIMEOUT_MS / 60_000)}m`;

/**
 * .what = the exit clause of a failure sentence — the words that say HOW the child ended
 *
 * .why  = `exitCode` is nullable, so a raw interpolation renders *"failed with exit code
 *   null"* — a fact that cannot be true, in a sentence whose whole job is to be trusted
 *   about a cause.
 *
 * .note = the null branch names BOTH causes because they are indistinguishable here —
 *   `execNpmInstall` reaches a null exit from `result.signal` (a kill) and from
 *   `result.error` (an ENOENT — no child ever ran).
 */
const asInstallExitWords = (exitCode: number | null): string =>
  exitCode === null
    ? 'without an exit code (killed, or never started)'
    : `with exit code ${exitCode}`;

/**
 * .what = casts a classified install failure into the error that reports it
 *
 * .why  = 🚨 **the class IS the exit code.** `getExitCodeFromError` reads `.code.exit` and
 *   defaults to 1, so a bespoke `class extends HelpfulError` would exit 1 on every row.
 *   the classification therefore lands on the two words that already carry an exit code:
 *
 *   | kind               | class       | exit | who fixes |
 *   |--------------------|-------------|------|-----------|
 *   | permission-denied  | constraint  | 2    | caller — elevate, or own the prefix |
 *   | package-absent     | constraint  | 2    | caller — correct the slug |
 *   | timed-out          | malfunction | 1    | retry — it may be transient |
 *   | unclassified       | malfunction | 1    | us        |
 *   | build-gate-blocked | (unreachable here) | — | nobody — it is not a failure |
 *
 * .note = `build-gate-blocked` is excluded by the INPUT TYPE, never by a guard clause — it
 *   is no failure at all, so both callers return before they reach this cast.
 *
 * ⚠️ the metadata key is `installExitCode`, never a bare `exitCode` — two exit codes reach
 *   a human from one failure and disagree by design (the table above).
 * ⚠️ the hint lives in `metadata.hint` ALONE, never also inside the sentence. both
 *   renderers read it by name, so an inline copy renders twice on one path and is lost on
 *   the other; `asNpmInstallFailureError.test.ts` `[case9]` counts each occurrence and
 *   asserts it appears EXACTLY ONCE.
 *
 * 🔴 .why EVERY kind carries `output`, bounded to a tail = the hint says *"read the output
 *   above"*, and **"above" is a fact of the INTERACTIVE channel alone**. `execNpmInstall`
 *   replays the bytes to a human before this classifies; a `--output json` consumer, or any
 *   caller that reads the thrown error's metadata, never saw that replay. so a payload with
 *   no output names a diagnostic the caller cannot reach on their own channel, which is
 *   `rule.require.errors-name-the-fix` inverted.
 *
 *   ⚠️ one family, ONE schema — a consumer keyed on `metadata.output` must not receive a
 *   string for three kinds and `undefined` for the fourth.
 *
 *   ⚠️ the bulk is bounded HERE, at the source, never at the render — a render that
 *   redacts by field strips the fix from `path` / `from` / `envVar`
 *   (`rule.require.unredacted-error-metadata`).
 *
 *   the byte count rides alongside because it is a fact the TAIL does not carry: it parts a
 *   package manager that wrote a long log from one that never started, which is the exact
 *   split the `unclassified` hint below branches on.
 */
/**
 * .what = how many lines from the END of a captured log reach the error's metadata
 * .why = generous enough to hold a package manager's error block with its context,
 *   bounded enough that it can never bury the hint beneath it
 */
const NPM_INSTALL_OUTPUT_TAIL_LINES = 20;

/**
 * .what = the last lines of a captured package-manager log
 * .why =
 *   - the whole log is BULK, and it was already streamed to the human by
 *     `execNpmInstall` before this classifies — so to attach it whole would print the
 *     same bytes twice and bury the one sentence that names the fix
 *   - but the log is not WORTHLESS: this file's own hint says *"its last error line
 *     names the cause"*, so the tail is the part that carries the diagnosis
 *
 * ⚠️ the bound belongs HERE, at the source, on the one field that carries bulk — never at
 *   the render (see `NPM_INSTALL_OUTPUT_TAIL_LINES`'s note above).
 */
const asOutputTail = (output: string): string =>
  output.split('\n').slice(-NPM_INSTALL_OUTPUT_TAIL_LINES).join('\n');

export const asNpmInstallFailureError = (input: {
  kind: Exclude<NpmInstallFailureKind, 'build-gate-blocked'>;
  target: NpmInstallTarget;
  packageManager: 'pnpm' | 'npm';
  exitCode: number | null;
  output: string;
  packages: string[];
  /**
   * .what = whether a shell sat between the upgrade and the package manager
   * ⚠️ REQUIRED, never optional — an absent value would default the `timed-out` sentence to
   *   the confident claim, which is the false one on exactly the host that needs the truth
   *   (`rule.forbid.undefined-inputs`)
   */
  shellPresence: NpmInstallShellPresence;
}): ConstraintError | MalfunctionError => {
  const where = input.target === 'global' ? 'global install' : 'install';

  // a permission wall is the caller's to fix, and the fix is nameable: elevate, or own
  // the prefix. a constraint, so the process exits 2 and a caller can tell this apart
  // from a defect of ours (rule.require.exit-code-semantics)
  if (input.kind === 'permission-denied') {
    // ⚠️ no article before `${packageManager}` — "a npm" is ungrammatical and "an pnpm" is
    //   too, so a template with either one renders wrong on one of the two values
    const hint = `retry with elevated permissions, or point ${input.packageManager} at a prefix you own`;
    return new ConstraintError(
      `${input.packageManager} ${where} failed ${asInstallExitWords(input.exitCode)} — permission denied`,
      {
        kind: input.kind,
        installExitCode: input.exitCode,
        packages: input.packages,
        output: asOutputTail(input.output),
        hint,
      },
    );
  }

  // a package the registry does not hold is the CALLER's to fix: correct the slug.
  // .why constraint = a retry with the same slug fails identically, so exit 1 would
  //   invite a pointless loop (rule.require.exit-code-semantics)
  if (input.kind === 'package-absent') {
    const hint = `check how ${input.packages.join(', ')} is spelt — the registry has no such package`;
    return new ConstraintError(
      `${input.packageManager} ${where} failed ${asInstallExitWords(input.exitCode)} — a requested package does not exist`,
      {
        kind: input.kind,
        installExitCode: input.exitCode,
        packages: input.packages,
        output: asOutputTail(input.output),
        hint,
      },
    );
  }

  // a timeout is a KNOWN cause with an obvious next move, so it must never fall through
  // to "cause unclassified".
  // .why malfunction = a stalled registry may be transient, and no change the caller
  //   makes to their own inputs would have prevented it (rule.require.exit-code-semantics)
  if (input.kind === 'timed-out') {
    // 🚨 the sentence must not claim we killed the package manager when we did not.
    //   `spawnSync`'s bound kills the child WE spawned; where a shell was interposed
    //   (win32, whose `pnpm`/`npm` are `.cmd` shims), that child is the SHELL, and the
    //   package manager beneath it survives and still holds its store lock. a confident
    //   *"was killed"* would send a human to retry against a live predecessor, so the
    //   report stops short of a claim it cannot back.
    //
    //   ⚠️ the orphan itself is NOT cured here — that needs a detached process-group kill
    //   `spawnSync` cannot express
    const clauseKilled =
      input.shellPresence === 'present'
        ? 'and the shell that wrapped it was killed'
        : 'and was killed';
    const hint =
      input.shellPresence === 'present'
        ? `${input.packageManager} itself may still be live and still hold its store lock — end any stray ${input.packageManager} process, then retry`
        : `check your network, then retry — or run the ${input.packageManager} ${where} by hand to watch where it stalls`;
    return new MalfunctionError(
      `${input.packageManager} ${where} exceeded its ${asInstallTimeoutWords()} bound ${clauseKilled}`,
      {
        kind: input.kind,
        installExitCode: input.exitCode,
        packages: input.packages,
        output: asOutputTail(input.output),
        hint,
      },
    );
  }

  // .why = an exit we could not place is OURS until proven otherwise. a constraint would
  //   tell a human "you can fix this" over a cause nobody named — loud about the wrong
  //   party (rule.forbid.failhide). so the hint names a DIAGNOSTIC, never a cure
  //
  // 🚨 and the diagnostic must not send them to output that IS NOT THERE. `unclassified`
  //   is reached by TWO routes and only one of them wrote bytes:
  //
  //     - a nonzero exit whose text the classifier could not place → bytes exist, and
  //       *"read the output above"* names a real move
  //     - a death with no exit — a crash, or an ENOENT where the package manager binary
  //       is absent, so no child ever ran → `output` is EMPTY, and that same sentence
  //       sends a human to hunt for a log that was never written
  //
  //   the second is this wish's own defect class in a different coat: a confident
  //   instruction aimed at a condition the human does not have, exactly as
  //   `pnpm rebuild node-pty` was. so the clause is read off the bytes we actually
  //   captured rather than assumed from the kind, and the empty branch names the cause
  //   that most often produces it (`rule.require.errors-name-the-fix`)
  //
  // ⚠️ *"above"* is a claim about the CALLER's terminal, not about this transformer.
  //   `execNpmInstall` replays the captured bytes before it classifies, which is what
  //   makes the word true — a caller that drops that replay owes this clause a change
  const hint =
    input.output === ''
      ? `${input.packageManager} wrote no output at all — it was killed, or it never started. check it is installed and on your PATH, then confirm whether the packages landed with \`rhx --version\``
      : `read the ${input.packageManager} output above — its last error line names the cause — then confirm whether the packages landed with \`rhx --version\``;
  return new MalfunctionError(
    `${input.packageManager} ${where} failed ${asInstallExitWords(input.exitCode)} — cause unclassified`,
    {
      kind: input.kind,
      installExitCode: input.exitCode,
      packages: input.packages,
      output: asOutputTail(input.output),
      outputBytes: input.output.length,
      hint,
    },
  );
};
