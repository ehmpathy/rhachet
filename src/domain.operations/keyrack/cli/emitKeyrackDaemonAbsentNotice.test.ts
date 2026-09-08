import { given, then, when } from 'test-fns';

import { emitKeyrackDaemonAbsentNotice } from './emitKeyrackDaemonAbsentNotice';

/**
 * .what = clamps the invariant this notice exists to hold: the guidance reaches a human on
 *         STDERR, and stdout stays untouched so `--json` keeps its parse contract
 * .why = the whole value of this operation is the split. a single line that leaked to stdout
 *        would break every `jq` caller of `keyrack status --json` — which is a worse defect
 *        than the silent `null` it was written to repair. so the split is not a style
 *        preference; it is what a clamp must check (`rule.require.clamp-edge-cases`)
 * .note = the console swap follows the extant precedent in `emitKeyrackBlockedReport.test.ts`
 *         — no mocks, just a capture of the streams this operation writes
 */
describe('emitKeyrackDaemonAbsentNotice', () => {
  const runCaptured = (input: {
    verb: 'status';
    owner: string | null;
  }): { stderr: string[]; stdout: string[] } => {
    const stderr: string[] = [];
    const stdout: string[] = [];
    const errorOriginal = console.error;
    const logOriginal = console.log;

    console.error = (msg: string) => stderr.push(msg);
    console.log = (msg: string) => stdout.push(msg);
    try {
      emitKeyrackDaemonAbsentNotice(input);
      return { stderr, stdout };
    } finally {
      console.error = errorOriginal;
      console.log = logOriginal;
    }
  };

  given('[case1] the json answer came back null for an absent daemon', () => {
    when('[t0] the notice is emitted', () => {
      then('not one byte reaches stdout, so `jq` still parses the null', () => {
        const { stdout } = runCaptured({ verb: 'status', owner: null });
        // the guard row: a leak here breaks every robot caller of `--json`, which is
        // strictly worse than the silent null this notice repairs
        expect(stdout).toEqual([]);
      });

      then('stderr names the cause — no daemon, not an empty filter', () => {
        const { stderr } = runCaptured({ verb: 'status', owner: null });
        const said = stderr.join('\n');
        expect(said).toContain('no daemon was found');
        // and it tells the two causes apart outright, which is the whole point:
        // `null` means no daemon; an empty narrow reads as an empty keys array
        expect(said).toContain('{ "keys": [] }');
      });

      then('stderr names a runnable fix', () => {
        const { stderr } = runCaptured({ verb: 'status', owner: null });
        const said = stderr.join('\n');
        expect(said).toContain('fix:');
        expect(said).toContain('rhx keyrack unlock');
      });

      then('the glyph is informational, never a refusal', () => {
        const { stderr } = runCaptured({ verb: 'status', owner: null });
        const said = stderr.join('\n');
        // exit stays 0 — an absent daemon is a true, ordinary answer, so `✋` would
        // misreport it as caller-must-fix (`rule.require.exit-code-semantics`)
        expect(said).toContain('💡');
        expect(said).not.toContain('✋');
      });

      then('the fix names the verb the human actually ran', () => {
        const { stderr } = runCaptured({ verb: 'status', owner: null });
        expect(stderr.join('\n')).toContain('keyrack status --json');
      });
    });
  });

  /**
   * .what = clamps the OWNER axis of the fix line, in both directions
   * .why = a daemon is per-owner, and this notice's own `why:` line says so. a fix that dropped
   *        `--owner` would start a session for the DEFAULT owner, the re-run would still read
   *        `null`, and the human would conclude the fix does not work — a fix line that
   *        contradicts the cause line directly above it
   * .note = both directions are clamped deliberately. a repair written to only the positive row
   *         would pass while it spelled `--owner` unconditionally, which is the mirror defect:
   *         an ask that named no owner read the DEFAULT daemon, so its fix must start that one
   */
  given('[case2] the ask named an explicit owner', () => {
    when('[t0] the notice is emitted', () => {
      then(
        'the fix starts a session on the SAME rack the read looked at',
        () => {
          const { stderr } = runCaptured({ verb: 'status', owner: 'ehmpath' });
          expect(stderr.join('\n')).toContain(
            'rhx keyrack unlock --owner ehmpath',
          );
        },
      );
    });
  });

  given('[case3] the ask named no owner', () => {
    when('[t0] the notice is emitted', () => {
      then('the fix spells no --owner, so it starts the default daemon', () => {
        const { stderr } = runCaptured({ verb: 'status', owner: null });
        expect(stderr.join('\n')).toContain('rhx keyrack unlock');
        expect(stderr.join('\n')).not.toContain('--owner');
      });
    });
  });
});
