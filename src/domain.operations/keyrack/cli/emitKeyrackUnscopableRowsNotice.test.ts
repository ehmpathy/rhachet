import { given, then, when } from 'test-fns';

import { KEYRACK_VALID_ENVS } from '../constants';
import { emitKeyrackUnscopableRowsNotice } from './emitKeyrackUnscopableRowsNotice';

/**
 * .what = clamps the four invariants this notice exists to hold: it is SILENT when it has no
 *         drop to announce, it never touches stdout, it names every dropped row rather than
 *         only their count, and it renders as guidance rather than as a refusal
 * .why = the emitter shipped with no clamp at all. every property below is one a caller could
 *        break without a single test going red — most of all the silent-when-empty one, since
 *        the call site invokes it unconditionally on every filtered sweep
 * .note = the console swap follows the extant precedent in its two peers
 *         (`emitKeyrackDaemonAbsentNotice.test.ts`, `emitKeyrackEmptyMachineWideSweepNotice.test.ts`)
 *         — no mocks, just a capture of the streams this operation writes
 */
describe('emitKeyrackUnscopableRowsNotice', () => {
  const runCaptured = (input: {
    slugs: string[];
  }): { stderr: string[]; stdout: string[] } => {
    const stderr: string[] = [];
    const stdout: string[] = [];
    const errorOriginal = console.error;
    const logOriginal = console.log;

    console.error = (msg: string) => stderr.push(msg);
    console.log = (msg: string) => stdout.push(msg);
    try {
      emitKeyrackUnscopableRowsNotice(input);
      return { stderr, stdout };
    } finally {
      console.error = errorOriginal;
      console.log = logOriginal;
    }
  };

  /**
   * .what = the GUARD case, and the one most likely to regress
   * .why = the call site emits on EVERY filtered sweep and leans on this operation to decide
   *        whether there is anything to say. a notice that spoke on an empty set would print a
   *        "0 row(s)" heads-up under every ordinary `list --org …` — noise on the surface whose
   *        whole job is to tell a human when the render is incomplete
   */
  given('[case1] the filter dropped no rows', () => {
    when('[t0] the notice is emitted', () => {
      then('not one byte reaches either stream', () => {
        const { stderr, stdout } = runCaptured({ slugs: [] });
        expect(stderr).toEqual([]);
        expect(stdout).toEqual([]);
      });
    });
  });

  given('[case2] the filter dropped rows that name no org and no env', () => {
    when('[t0] one row was dropped', () => {
      then(
        'stdout stays untouched, so a grep or a parse is undisturbed',
        () => {
          // the guard row: a filtered `list`/`status` stdout is the answer a human greps and a
          // caller parses. guidance that leaked into it would corrupt both
          const { stdout } = runCaptured({ slugs: ['LEGACY_KEY'] });
          expect(stdout).toEqual([]);
        },
      );

      then('stderr names the row itself, never only a count', () => {
        // ⚠️ .why = a count alone ("1 row hidden") tells a human that something vanished and
        //        leaves them to hunt for WHICH. the slug is the whole actionable payload
        const { stderr } = runCaptured({ slugs: ['LEGACY_KEY'] });
        expect(stderr.join('\n')).toContain('LEGACY_KEY');
      });

      then('stderr names the cause — hidden, never absent', () => {
        // the distinction this notice exists for: the row is on the rack and the filter could
        // not claim it. a human who reads "absent" re-runs `keyrack set` and overwrites it
        const { stderr } = runCaptured({ slugs: ['LEGACY_KEY'] });
        expect(stderr.join('\n')).toContain('hidden here, not absent');
      });

      then('stderr names a runnable fix', () => {
        const { stderr } = runCaptured({ slugs: ['LEGACY_KEY'] });
        const said = stderr.join('\n');
        expect(said).toContain('fix:');
        expect(said).toContain('--org/--env');
      });

      then(
        'stderr names the RULE a look-alike row breaks, not just the shape',
        () => {
          // ⚠️ .why = the hardest row is one that appears to name both an org and an env.
          //        `testorg.mainframe.OTHER_KEY` has three dot-segments and reads as
          //        `<org>.<env>.<key>` at a glance; it is unfilterable only because `mainframe`
          //        is no recognized env. a notice that merely says "names no org and no env"
          //        states a truth this human will read as flatly wrong — on the very row that
          //        most needs the account. so the render must name the env RULE and spell the
          //        recognized set, and this row goes red if it drifts back to the shape alone
          const { stderr } = runCaptured({
            slugs: ['testorg.mainframe.OTHER_KEY'],
          });
          const said = stderr.join('\n');
          expect(said).toContain('must be one of');
          for (const env of KEYRACK_VALID_ENVS) expect(said).toContain(env);
          expect(said).toContain('LOOKS like a slug');
        },
      );

      then('the glyph is informational, never a refusal', () => {
        // the sweep SUCCEEDED and exits 0, so `✋` would misreport a true answer as a refusal
        // (`rule.require.exit-code-semantics`, `rule.require.keyrack-emoji-palette`)
        const { stderr } = runCaptured({ slugs: ['LEGACY_KEY'] });
        const said = stderr.join('\n');
        expect(said).toContain('💡');
        expect(said).not.toContain('✋');
      });
    });

    when('[t1] several rows were dropped', () => {
      then('EVERY row is named, and the count agrees with them', () => {
        // ⚠️ .why = a render that listed the first row and counted the rest would pass every
        //        single-row row above. the count and the list are two claims, and this is the
        //        only row where they can disagree
        const { stderr } = runCaptured({
          slugs: ['LEGACY_KEY', 'ANOTHER_BARE_KEY', 'A_THIRD'],
        });
        const said = stderr.join('\n');
        expect(said).toContain('3 row(s)');
        expect(said).toContain('LEGACY_KEY');
        expect(said).toContain('ANOTHER_BARE_KEY');
        expect(said).toContain('A_THIRD');
      });
    });
  });
});
