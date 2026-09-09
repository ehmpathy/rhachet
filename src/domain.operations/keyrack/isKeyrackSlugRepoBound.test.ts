import { given, then, when } from 'test-fns';

import { isKeyrackSlugRepoBound } from './isKeyrackSlugRepoBound';

/**
 * .what = the unit clamp for the predicate that makes the union STRICT
 * .why = its error is ASYMMETRIC. an understatement (`false` where the truth is `true`) costs
 *        one wasted manifest load — today's behavior. an OVERSTATEMENT costs a skipped load,
 *        which retires the ORG_MISMATCH guard for a real org's namespace. so the `true` rows
 *        below are the security rows, and the `false` rows are what keep the wish's own
 *        use case (a bare key with `--org @all`) manifest-free
 */
describe('isKeyrackSlugRepoBound', () => {
  given('[case1] a key that NAMES a real org', () => {
    when('[t0] a full slug with a literal org', () => {
      // ⚠️ .why = THE SECURITY ROW. asKeyrackKeySlug.ts compares THIS org segment against
      //         the manifest's, and never reads `--org`. so the ask is manifest-bound whatever
      //         the flag says — a flag cannot waive a check it is not an input to
      then('it is repo-bound', () => {
        expect(isKeyrackSlugRepoBound({ slug: 'ehmpathy.prep.FOO' })).toEqual(
          true,
        );
      });
    });

    when('[t1] a full slug with the @this sigil', () => {
      // .why = `@this` MEANS the manifest's org, so it cannot be read without one
      then('it is repo-bound', () => {
        expect(isKeyrackSlugRepoBound({ slug: '@this.prep.FOO' })).toEqual(
          true,
        );
      });
    });

    when('[t2] a LOOKALIKE org', () => {
      // .why = `@allstar` is a real org whose name merely starts with the letters `@all`
      then('it is repo-bound, not machine-wide', () => {
        expect(isKeyrackSlugRepoBound({ slug: '@allstar.prep.FOO' })).toEqual(
          true,
        );
      });
    });
  });

  given('[case2] a key that names NO org', () => {
    when('[t0] a bare key name', () => {
      // ⚠️ .why = THE USE-CASE ROW. a bare key states no provenance, so it DEFERS to `--org` —
      //         which is exactly what lets `get --org @all --key GITHUB_TOKEN` skip the
      //         manifest, the wish's primary use case (1.vision u1). a `true` here would
      //         re-break the reported defect
      then('it is NOT repo-bound', () => {
        expect(isKeyrackSlugRepoBound({ slug: 'GITHUB_TOKEN' })).toEqual(false);
      });
    });

    when('[t1] a DOTTED key name with no valid env segment', () => {
      // .why = `my.api.KEY` is a bare key, not org `my` in env `api`. the env segment must be
      //        a valid env for a string to read as a full slug at all
      then('it is NOT repo-bound', () => {
        expect(isKeyrackSlugRepoBound({ slug: 'my.api.KEY' })).toEqual(false);
      });
    });
  });

  given('[case3] a machine-wide slug', () => {
    when('[t0] a full @all slug', () => {
      // .why = asKeyrackKeySlug exempts the `@all` sigil from ORG_MISMATCH, so no manifest
      //        contributes any part of this slug's answer
      then('it is NOT repo-bound', () => {
        expect(isKeyrackSlugRepoBound({ slug: '@all.camp.TOKEN' })).toEqual(
          false,
        );
      });
    });

    when('[t1] an @all slug in env.all', () => {
      // .note = `@all` (org) and `env.all` are different axes; `@all.all.FOO` is legal
      then('it is NOT repo-bound', () => {
        expect(isKeyrackSlugRepoBound({ slug: '@all.all.FOO' })).toEqual(false);
      });
    });

    when('[t2] the org IS the sigil, but the env segment is invalid', () => {
      // ⚠️ .why = this row is the twin of `isKeyrackSlugMachineWide [case2][t5]`, and the PAIR
      //        is the point: both must say false, because the key is neither — it is a bare
      //        name. before one shared classifier, the two read this string with two different
      //        parsers, so they could disagree, and the disagreement was silent
      then('it is NOT repo-bound either — it is bare', () => {
        expect(isKeyrackSlugRepoBound({ slug: '@all.badenv.FOO' })).toEqual(
          false,
        );
      });
    });
  });
});
