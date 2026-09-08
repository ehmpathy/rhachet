import { given, then, when } from 'test-fns';

import { asKeyrackSlugOrgKind } from './asKeyrackSlugOrgKind';
import { isKeyrackSlugMachineWide } from './isKeyrackSlugMachineWide';
import { isKeyrackSlugRepoBound } from './isKeyrackSlugRepoBound';

/**
 * .what = the clamp for `one parser decides a key's provenance, so the two predicates agree`
 * .why = `isKeyrackSlugMachineWide` and `isKeyrackSlugRepoBound` read the SAME string and were
 *        built on two different parsers. their disagreement is SILENT — it yields a wrong
 *        answer, never a throw — so only a row that names the divergent input can catch it
 *
 * .note = the exhaustive `[case4]` sweep is what gives this teeth beyond any single row: the
 *         three kinds must partition every key, so a future fourth kind, or an overlap between
 *         two, fails here rather than in a credential path
 */
describe('asKeyrackSlugOrgKind', () => {
  given('[case1] a FULL slug whose org is the machine-wide sigil', () => {
    when('[t0] the env segment is valid', () => {
      then('it is machine-wide', () => {
        expect(
          asKeyrackSlugOrgKind({ slug: '@all.camp.GITHUB_TOKEN' }),
        ).toEqual('machine-wide');
      });

      then(
        '`env.all` is a different axis, and does not change the kind',
        () => {
          // .why = `@all` (org) and `all` (env) are orthogonal; `@all.all.FOO` is legal
          expect(asKeyrackSlugOrgKind({ slug: '@all.all.FOO' })).toEqual(
            'machine-wide',
          );
        },
      );
    });

    when('[t1] the env segment is NOT a valid env — THE DIVERGENCE', () => {
      // ⚠️ .why = this is the row the two-parser split got wrong. a naive `split('.')[0]` reads
      //        `@all` and calls it machine-wide; the validated decode rejects `badenv` and calls
      //        it a bare key name. read as machine-wide, the manifest load is SKIPPED, and the
      //        read then reports "add keyrack.yml to repo" from inside a repo that HAS one
      then('it is BARE, never machine-wide', () => {
        expect(asKeyrackSlugOrgKind({ slug: '@all.badenv.FOO' })).toEqual(
          'bare',
        );
      });

      then('so the manifest-skip predicate says false', () => {
        expect(isKeyrackSlugMachineWide({ slug: '@all.badenv.FOO' })).toEqual(
          false,
        );
      });
    });
  });

  given('[case2] a FULL slug whose org is some other value', () => {
    when('[t0] the org is a real one', () => {
      then('it is repo-bound', () => {
        expect(asKeyrackSlugOrgKind({ slug: 'ehmpathy.prep.FOO' })).toEqual(
          'repo-bound',
        );
      });
    });

    when('[t1] the org is the `@this` sigil', () => {
      // .why = `@this` MEANS the manifest's org, so it is the most manifest-bound value there is
      then('it is repo-bound', () => {
        expect(asKeyrackSlugOrgKind({ slug: '@this.prep.FOO' })).toEqual(
          'repo-bound',
        );
      });
    });

    when('[t2] the org merely STARTS with the sigil letters', () => {
      // .why = the test is the whole org segment, never a prefix match
      then('it is repo-bound', () => {
        expect(asKeyrackSlugOrgKind({ slug: '@allstar.prep.FOO' })).toEqual(
          'repo-bound',
        );
      });
    });
  });

  given('[case3] a key that is not a full slug at all', () => {
    when('[t0] it carries no dots', () => {
      then('it is bare, so it defers to --org', () => {
        expect(asKeyrackSlugOrgKind({ slug: 'GITHUB_TOKEN' })).toEqual('bare');
      });
    });

    when('[t1] it carries dots, but no valid env segment', () => {
      // .why = the env segment is what separates a slug from a dotted key NAME
      then('it is bare', () => {
        expect(asKeyrackSlugOrgKind({ slug: 'my.api.KEY' })).toEqual('bare');
      });
    });

    when('[t2] it has only two segments', () => {
      then('it is bare', () => {
        expect(asKeyrackSlugOrgKind({ slug: 'ehmpathy.FOO' })).toEqual('bare');
      });
    });
  });

  given('[case4] the two predicates derived from this one classifier', () => {
    // ⚠️ .why = the ONLY reason this classifier exists is that the two predicates must never
    //        disagree. a row-by-row test of each cannot prove that; a sweep over every kind can
    const slugs = [
      '@all.camp.GITHUB_TOKEN',
      '@all.all.FOO',
      '@all.badenv.FOO',
      'ehmpathy.prep.FOO',
      '@this.prep.FOO',
      '@allstar.prep.FOO',
      'ehmpathy.all.FOO',
      'GITHUB_TOKEN',
      'my.api.KEY',
      'ehmpathy.FOO',
    ];

    when('[t0] every kind is walked', () => {
      then('the two are never both true — the kinds are exclusive', () => {
        const bothTrue = slugs.filter(
          (slug) =>
            isKeyrackSlugMachineWide({ slug }) &&
            isKeyrackSlugRepoBound({ slug }),
        );
        expect(bothTrue).toEqual([]);
      });

      then('each agrees with the classifier it is derived from', () => {
        const disagreements = slugs.filter((slug) => {
          const kind = asKeyrackSlugOrgKind({ slug });
          return (
            isKeyrackSlugMachineWide({ slug }) !== (kind === 'machine-wide') ||
            isKeyrackSlugRepoBound({ slug }) !== (kind === 'repo-bound')
          );
        });
        expect(disagreements).toEqual([]);
      });

      then('a `bare` key is neither — it states no provenance', () => {
        const bare = slugs.filter(
          (slug) => asKeyrackSlugOrgKind({ slug }) === 'bare',
        );
        // .why = pinned rather than merely non-empty, so a kind that silently migrates
        //        into or out of `bare` shows as a diff
        expect(bare).toEqual([
          '@all.badenv.FOO',
          'GITHUB_TOKEN',
          'my.api.KEY',
          'ehmpathy.FOO',
        ]);
        for (const slug of bare) {
          expect(isKeyrackSlugMachineWide({ slug })).toEqual(false);
          expect(isKeyrackSlugRepoBound({ slug })).toEqual(false);
        }
      });
    });
  });
});
