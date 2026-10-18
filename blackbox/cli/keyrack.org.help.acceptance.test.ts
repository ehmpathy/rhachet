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

        then('help says which org @this names, since a list org: holds several', () => {
          // .why = once `org:` may list several orgs, `@this` reads as "this repo's keys" — and a
          //        member org's keys are this repo's keys too, yet `@this` never selects them.
          //        the help must name the one org it does select
          expect(result.stdout).toMatch(/@this\s+\(the\s+first\s+org\s+in\s+keyrack\.yml\)/);
        });

        then('help names the third value a human may pass, and claims only the gate it holds', () => {
          // .why = a help that names only the two sigils hides the third value a human may
          //        pass. a REPO sweep (source, unlock) re-slugs the manifest's keys under a
          //        member and refuses a non-member, so its help names the allowlist. a HOST
          //        sweep (status, list) filters the slugs this host holds with no gate, so its
          //        help names any org — a claim of an allowlist there would be a gate it lacks.
          //        `\s+` because commander wraps the description at the term width
          const isRepoSweep = command === 'source' || command === 'unlock';
          if (isRepoSweep) return expect(result.stdout).toMatch(/allowlisted\s+org/);
          expect(result.stdout).toMatch(/any\s+org/);
          expect(result.stdout).not.toMatch(/allowlisted\s+org/);
        });

        // ⚠️ .why = THE ROW THAT MATTERS. the union default is this wish's backwards-compat
        //         guarantee: a caller who passes no `--org` must observe exactly the scope
        //         the verb always had. `[case9][t0]` clamps that the CODE honors it; this
        //         clamps that the HELP says so. a human who cannot read the default off the
        //         help must run the command to discover its scope — and on `unlock` that
        //         experiment mutates a session
        then('help states the default is NO filter', () => {
          // `\s+` because commander wraps the description at the term width, and may break
          // after `default:` (it does on `source`)
          expect(result.stdout).toMatch(/default:\s+no\s+filter/);
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
          //    actually reads (`rule.forbid.snapshot-visual-blemishes`). `\s+` because commander
          //    wraps the description at the term width, and may break after `default:`
          expect(result.stdout).toMatch(/default:\s+"@this"/);
          expect(result.stdout).not.toMatch(/default:\s+no\s+filter/);
        });

        then('help names the org allowlist, so a member is a known door', () => {
          // .why = `--org <member>` selects any org the manifest lists. a help that names only
          //        `@this` and `@all` hides the member door the allowlist opens
          expect(result.stdout).toMatch(/allowlisted\s+org/);
        });

        then('help says which org the @this default names', () => {
          // .why = the default is `@this`, and with a list `org:` a human must know which member
          //        a bare ask reads — the first, never a union
          expect(result.stdout).toMatch(/@this\s+\(the\s+first\s+org\s+in\s+keyrack\.yml\)/);
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
