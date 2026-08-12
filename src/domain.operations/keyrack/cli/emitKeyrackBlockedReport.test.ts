import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { emitKeyrackBlockedReport } from './emitKeyrackBlockedReport';

/**
 * .what = clamps the ONE invariant this operation exists to hold: the blocked render and
 *         the caller-fixable exit code are inseparable
 * .why = the four keyrack guards each used to repeat `console.error(getKeyrackBlockedReport(…))`
 *        followed by `process.exitCode = 2`. a new guard could land with one and not the
 *        other — and at i004 one did, which is the defect that motivated the extraction.
 *        the extraction makes the pair structural; this makes it CHECKED, so a later edit
 *        that drops either half goes red instead of silent (rule.require.clamp-edge-cases)
 * .note = the console swap follows the extant precedent in `emitKeyrackKeyBranch.test.ts` —
 *         no mocks, just a capture of the streams this operation writes
 */
describe('emitKeyrackBlockedReport', () => {
  /**
   * .what = runs the emit with both streams captured and the exit code restored after
   * .why = every case needs the same capture, and a leaked `process.exitCode` would
   *        poison the whole jest run — it is the code the runner itself exits with
   */
  // .note = generic over the metadata shape for the same reason the operation itself is:
  //         `ConstraintError<T>` is INVARIANT in `T`, so a `ConstraintError<{hint: string}>`
  //         is not assignable to `ConstraintError<{hint?: string}>`. a fixed parameter here
  //         would reject every realistic error a caller builds
  const runCaptured = <TMetadata extends { hint?: string }>(input: {
    error: ConstraintError<TMetadata>;
    command: string;
  }): { stderr: string[]; stdout: string[]; exitCode: number | undefined } => {
    const stderr: string[] = [];
    const stdout: string[] = [];
    const errorOriginal = console.error;
    const logOriginal = console.log;
    const exitCodeBefore = process.exitCode;

    console.error = (msg: string) => stderr.push(msg);
    console.log = (msg: string) => stdout.push(msg);
    try {
      emitKeyrackBlockedReport(input);
      return {
        stderr,
        stdout,
        exitCode: process.exitCode as number | undefined,
      };
    } finally {
      console.error = errorOriginal;
      console.log = logOriginal;
      process.exitCode = exitCodeBefore;
    }
  };

  given('[case1] a caller-fixable refusal', () => {
    const error = new ConstraintError(
      `--reach requires a key: a reach names one reach`,
      { hint: `name the key — rhx keyrack get --key $KEY --reach $REACH` },
    );

    when('[t0] it is emitted for a named command', () => {
      then('the report renders as the blocked treestruct', () => {
        const { stderr } = runCaptured({ error, command: 'keyrack get' });
        const rendered = stderr.join('\n');
        // a treestruct rooted on keyrack's own lock glyph, never a raw `ConstraintError: …`
        // class dump
        // .note = the root is `🔐 <command>` and carries NO role mascot. keyrack output roots
        //         on the LOCK, because a keyrack refusal is about a credential rather than
        //         about whichever role happened to type the command
        //         (`rule.require.keyrack-emoji-palette`)
        expect(rendered).toContain('🔐 keyrack get');
        expect(rendered).toContain('--reach requires a key');
        // ⛔ the mascot must never come back. this assertion is the regression net for it —
        //    a `🐢 bummer dude...` banner reappeared here once already, via a stale branch
        expect(rendered).not.toContain('bummer dude');
        expect(rendered).not.toContain('🐢');
      });

      then('the hint reaches the human, so the error names its fix', () => {
        const { stderr } = runCaptured({ error, command: 'keyrack get' });
        expect(stderr.join('\n')).toContain('name the key');
      });

      then('the exit code is 2 — caller-fixable, never 1', () => {
        // a MalfunctionError is exit 1 and means WE broke; a refusal of bad input is
        // exit 2 and means the caller can fix it (rule.require.exit-code-semantics)
        const { exitCode } = runCaptured({ error, command: 'keyrack get' });
        expect(exitCode).toEqual(2);
      });

      then('it writes to stderr, never stdout', () => {
        // stdout is the machine-readable channel — `keyrack source` evals it. a refusal
        // that landed there would be sourced as shell, not read as an error
        const { stdout, stderr } = runCaptured({
          error,
          command: 'keyrack get',
        });
        expect(stdout).toEqual([]);
        expect(stderr.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] the same error, emitted for a different command', () => {
    const error = new ConstraintError(`two keys would both export 'API_KEY'`, {
      hint: `source one env at a time`,
    });

    when('[t0] the command name differs', () => {
      then('the render names the command the human actually typed', () => {
        const forSource = runCaptured({ error, command: 'keyrack source' });
        const forUnlock = runCaptured({ error, command: 'keyrack unlock' });
        expect(forSource.stderr.join('\n')).toContain('keyrack source');
        expect(forUnlock.stderr.join('\n')).toContain('keyrack unlock');
      });

      then('the exit code is 2 regardless of which command emitted it', () => {
        // the render and the code travel together as a property of the OPERATION, not
        // of any one call site — which is the whole reason they were made inseparable
        expect(
          runCaptured({ error, command: 'keyrack source' }).exitCode,
        ).toEqual(2);
        expect(
          runCaptured({ error, command: 'keyrack unlock' }).exitCode,
        ).toEqual(2);
      });
    });
  });
});
