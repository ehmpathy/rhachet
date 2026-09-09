import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = `--help` clamps for every command whose `--org` is a FILTER
 * .why = a cli flag is a PUBLISHED CONTRACT, and `--help` is the one place a human looks to
 *        learn it exists (`rule.require.help-on-demand`). `status` and `list` are class-1
 *        verbs — they had NO `--org` at all before this wish — so their help text is the
 *        entire discovery surface for the flag, and it had no snapshot of any kind
 *
 * .note = the twin of keyrack.reach.help.acceptance.test.ts, and built to its pattern. that
 *         file records how its own gap shipped a real drift: `source` advertised `--reach`
 *         with no word of the constraint while `get` and `unlock` stated it, and every
 *         assertion stayed green because none of them looked. the same hazard applies to
 *         `--org`, across four commands that must read identically
 * .note = the `toContain` rows are the clamp with teeth; the snapshot beside them catches a
 *         silent change to the DESCRIPTION, which is the text a human reads to learn what a
 *         provenance even is (`rule.forbid.snapshot-visual-blemishes`)
 */
describe('keyrack --org help', () => {
  given('[case1] the commands whose --org FILTERS a swept set', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    // one `when` per command, so a drop on ONE of the four names itself in the failure
    for (const command of ['source', 'unlock', 'status', 'list'] as const) {
      when(`[t-${command}] rhx keyrack ${command} --help`, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            binary: 'rhx',
            args: ['keyrack', command, '--help'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('exits with status 0', () => {
          expect(result.status).toEqual(0);
        });

        then('help advertises --org', () => {
          expect(result.stdout).toContain('--org');
        });

        then('help names BOTH sigils, so neither is guesswork', () => {
          // .why = a human who reads only `@all` cannot infer that `@this` exists, and a
          //        flag whose valid set is undiscoverable fails rule.require.discoverability
          expect(result.stdout).toContain('@all');
          expect(result.stdout).toContain('@this');
        });

        // ⚠️ .why = THE ROW THAT MATTERS. the union default is this wish's backwards-compat
        //         guarantee: a caller who passes no `--org` must observe exactly the scope
        //         the verb always had. `[case9][t0]` clamps that the CODE honors it; this
        //         clamps that the HELP says so. a human who cannot read the default off the
        //         help must run the command to discover its scope — and on `unlock` that
        //         experiment mutates a session
        then('help states the default is NO filter', () => {
          expect(result.stdout).toContain('default: no filter');
        });

        then('the reply is snapped', () => {
          expect(result.stdout).toMatchSnapshot('stdout');
          expect(result.stderr).toMatchSnapshot('stderr');
        });
      });
    }
  });

  given('[case2] the commands whose --org SELECTS one slug segment', () => {
    // .why = `--org` carries ONE sense — provenance — at TWO arities: a keyed ask SELECTS a
    //        slug segment, a sweep FILTERS a set (domain.terms/term=sweep._.choice.example=
    //        org-filter-vs-selector.md). the two therefore need OPPOSITE defaults, and this
    //        case is the executable statement of that difference. without it, a later author
    //        who saw the four `default: no filter` strings could "unify" the flag by a swap
    //        of these three to the same default — which would quietly widen every keyed ask
    //        from this repo's org to every org on the box
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    for (const command of ['get', 'set', 'del'] as const) {
      when(`[t-${command}] rhx keyrack ${command} --help`, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            binary: 'rhx',
            args: ['keyrack', command, '--help'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('help advertises --org', () => {
          expect(result.stdout).toContain('--org');
        });

        then('help declares the @this default — NOT "no filter"', () => {
          // ⚠️ .why.quotes = `default: "@this"` is COMMANDER's own render, from the third
          //    `.option()` arg — and it is now the ONLY place that string comes from. the
          //    description used to hand-author a `(default: @this)` twin beside it, so the help
          //    printed the default TWICE and this row matched the hand-authored copy. with the
          //    twin gone the row asserts the real, generated one, which is the string a human
          //    actually reads (`rule.forbid.snapshot-visual-blemishes`)
          expect(result.stdout).toContain('default: "@this"');
          expect(result.stdout).not.toContain('default: no filter');
        });

        // ⚠️ .why = `--help` is a published, human-read contract, and [case1] snaps it for all
        //    four of its filter peers. the two rows above pin the flag's NAME and its DEFAULT
        //    and leave the description — the sentence a human reads to learn what a provenance
        //    even IS — entirely unheld, along with the usage line and the option list. a drift
        //    there is exactly the silent change [case1]'s own header says the snapshot exists
        //    to catch (`rule.require.contract-snapshot-exhaustiveness`)
        then('the reply is snapped', () => {
          expect(result.stdout).toMatchSnapshot('stdout');
          expect(result.stderr).toMatchSnapshot('stderr');
        });
      });
    }
  });
});
