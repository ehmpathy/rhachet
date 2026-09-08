import { given, then, when } from 'test-fns';

import { isKeyrackSlugMachineWide } from './isKeyrackSlugMachineWide';

describe('isKeyrackSlugMachineWide', () => {
  given('[case1] a machine-wide slug', () => {
    when('[t0] the org segment is exactly @all', () => {
      then('it is machine-wide', () => {
        expect(
          isKeyrackSlugMachineWide({ slug: '@all.camp.GITHUB_TOKEN' }),
        ).toEqual(true);
      });

      then('env=all on the machine-wide org is still machine-wide', () => {
        expect(isKeyrackSlugMachineWide({ slug: '@all.all.FOO' })).toEqual(
          true,
        );
      });
    });
  });

  given('[case2] a slug that must NOT read as machine-wide', () => {
    // .why = an over-report skips the manifest load, which makes the slug pass through
    //        verbatim and the ORG_MISMATCH guard never run. that failure is SILENT and
    //        successful — a branch-level test cannot see it, so it is clamped here
    when('[t0] the org is a real org', () => {
      then('it is not machine-wide', () => {
        expect(isKeyrackSlugMachineWide({ slug: 'ehmpathy.prep.FOO' })).toEqual(
          false,
        );
      });
    });

    when('[t1] the org merely STARTS WITH the letters @all', () => {
      then('it is not machine-wide', () => {
        expect(isKeyrackSlugMachineWide({ slug: '@allstar.prep.FOO' })).toEqual(
          false,
        );
      });
    });

    when('[t2] the org is the @this sigil', () => {
      then('it is not machine-wide', () => {
        expect(isKeyrackSlugMachineWide({ slug: '@this.prep.FOO' })).toEqual(
          false,
        );
      });
    });

    when('[t3] the ENV segment is all, on a real org', () => {
      // .why = `@all` (org sigil) and `all` (an env value) are different axes of the slug.
      //        a loose match on the string `all` would treat every env-all key of every org
      //        as machine-wide — a far wider hole than the @allstar case
      then('it is not machine-wide', () => {
        expect(isKeyrackSlugMachineWide({ slug: 'ehmpathy.all.FOO' })).toEqual(
          false,
        );
      });
    });

    when('[t4] a bare key name, no org segment at all', () => {
      then('it is not machine-wide', () => {
        expect(isKeyrackSlugMachineWide({ slug: 'GITHUB_TOKEN' })).toEqual(
          false,
        );
      });
    });

    when('[t5] the org IS the sigil, but the env segment is invalid', () => {
      // ⚠️ .why = the divergence a two-parser split hid. a naive `split('.')[0]` reads `@all`
      //        here and calls it machine-wide, while the validated decode rejects `badenv` and
      //        calls it a bare key name. read as machine-wide, the manifest load is SKIPPED, and
      //        the read then reports "add keyrack.yml to repo" from inside a repo that HAS one —
      //        an OVERSTATEMENT, whose cost is a wrong answer rather than a wasted load
      then('it is not machine-wide — it is not a full slug at all', () => {
        expect(isKeyrackSlugMachineWide({ slug: '@all.badenv.FOO' })).toEqual(
          false,
        );
      });
    });
  });
});
