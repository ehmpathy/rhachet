import { given, then, when } from 'test-fns';

import { emitKeyrackEmptyMachineWideSweepNotice } from './emitKeyrackEmptyMachineWideSweepNotice';

/**
 * .what = clamps the two invariants this notice exists to hold: the guidance reaches a human on
 *         STDERR with stdout untouched, and the `fix:` command reads the SAME rack the sweep read
 * .why = the emitter had an acceptance snapshot but no unit clamp, so its per-axis behavior was
 *        pinned only where a temp repo happened to exercise it. an axis a snapshot never varies
 *        is an axis with no guard — which is how the owner axis reached this file wrong
 * .note = the console swap follows the extant precedent in `emitKeyrackDaemonAbsentNotice.test.ts`
 *         — no mocks, just a capture of the streams this operation writes
 */
describe('emitKeyrackEmptyMachineWideSweepNotice', () => {
  const runCaptured = (input: {
    env: string | null;
    verb: 'source' | 'get';
    owner: string | null;
  }): { stderr: string[]; stdout: string[] } => {
    const stderr: string[] = [];
    const stdout: string[] = [];
    const errorOriginal = console.error;
    const logOriginal = console.log;

    console.error = (msg: string) => stderr.push(msg);
    console.log = (msg: string) => stdout.push(msg);
    try {
      emitKeyrackEmptyMachineWideSweepNotice(input);
      return { stderr, stdout };
    } finally {
      console.error = errorOriginal;
      console.log = logOriginal;
    }
  };

  given('[case1] a repo sweep narrowed to @all came back empty', () => {
    when('[t0] the notice is emitted', () => {
      then('not one byte reaches stdout', () => {
        const { stdout } = runCaptured({
          env: 'test',
          verb: 'source',
          owner: null,
        });
        // the guard row: `source`'s stdout is EVAL'd, so a leak here would be executed as
        // shell — strictly worse than the silent empty answer this notice repairs
        expect(stdout).toEqual([]);
      });

      then(
        'stderr names the cause — empty by construction, not contingent',
        () => {
          const { stderr } = runCaptured({
            env: 'test',
            verb: 'source',
            owner: null,
          });
          expect(stderr.join('\n')).toContain('empty by construction');
        },
      );

      then('the glyph is informational, never a refusal', () => {
        const { stderr } = runCaptured({
          env: 'test',
          verb: 'source',
          owner: null,
        });
        // the sweep SUCCEEDED and exits 0, so `✋` would misreport a true answer as a refusal
        const said = stderr.join('\n');
        expect(said).toContain('💡');
        expect(said).not.toContain('✋');
      });
    });
  });

  /**
   * .what = clamps the OWNER axis in both directions
   * .why = a keyrack is per-owner. a fix line that drops `--owner` sends a human who ran
   *        `--owner ehmpath` to the DEFAULT owner's rack, where the key they were told to name
   *        is genuinely absent — so the fix answers a different question than the one asked
   */
  given('[case2] the sweep named an explicit owner', () => {
    when('[t0] the notice is emitted', () => {
      then('the fix reads the SAME rack the sweep read', () => {
        const { stderr } = runCaptured({
          env: 'camp',
          verb: 'source',
          owner: 'ehmpath',
        });
        expect(stderr.join('\n')).toContain(
          'rhx keyrack source --owner ehmpath --key @all.camp.<name>',
        );
      });
    });
  });

  given('[case3] the sweep named no owner', () => {
    when('[t0] the notice is emitted', () => {
      then('the fix spells no --owner, so it reads the default rack', () => {
        const { stderr } = runCaptured({
          env: 'camp',
          verb: 'get',
          owner: null,
        });
        const said = stderr.join('\n');
        expect(said).toContain('rhx keyrack get --key @all.camp.<name>');
        expect(said).not.toContain('--owner');
      });
    });
  });

  /**
   * .what = the verb rides through, so the fix never hands a human a different command than the
   *         one they ran
   */
  given('[case4] the two verbs that can reach this notice', () => {
    when('[t0] a `get` sweep emits it', () => {
      then('the fix names `get`', () => {
        const { stderr } = runCaptured({
          env: 'test',
          verb: 'get',
          owner: null,
        });
        expect(stderr.join('\n')).toContain('rhx keyrack get --key');
      });
    });

    when('[t1] the env is absent', () => {
      then('the slug spells a placeholder rather than a wrong env', () => {
        const { stderr } = runCaptured({
          env: null,
          verb: 'source',
          owner: null,
        });
        expect(stderr.join('\n')).toContain('@all.<env>.<name>');
      });
    });
  });
});
