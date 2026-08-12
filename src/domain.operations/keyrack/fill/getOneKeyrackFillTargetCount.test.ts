import { given, then, when } from 'test-fns';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import { getAllKeyrackFillTargets } from './getAllKeyrackFillTargets';
import { getOneKeyrackFillTargetCount } from './getOneKeyrackFillTargetCount';

/**
 * .what = clamps `fill`'s progress denominator against the loop it describes
 * .why = a total derived by its own arithmetic can drift from the work actually walked,
 *        and the drift renders as a wrong `(n/total)` with no failure to catch it. so the
 *        claim that bites here is not "the number is 4" — it is "the number equals what
 *        getAllKeyrackFillTargets yields", which is what makes the drift impossible
 */
describe('getOneKeyrackFillTargetCount', () => {
  const genKeys = (input: {
    exidsBySlug: Record<string, string[]>;
  }): KeyrackRepoManifest['keys'] =>
    Object.fromEntries(
      Object.entries(input.exidsBySlug).map(([slug, exids]) => [
        slug,
        { reaches: exids.map((exid) => asKeyrackKeyReach({ exid })) },
      ]),
    ) as KeyrackRepoManifest['keys'];

  given('[case1] two keys, one of which declares two reaches', () => {
    const keys = genKeys({
      exidsBySlug: {
        'org.test.A': ['github://org=ahbode', 'beav@ehmpathy.com'],
        'org.test.B': [],
      },
    });
    const slugs = ['org.test.A', 'org.test.B'];

    when('[t0] counted for one owner', () => {
      const count = getOneKeyrackFillTargetCount({
        slugs,
        keys,
        owners: ['ehmpath'],
      });

      then('it equals what the target derivation yields, key by key', () => {
        const walked = slugs
          .map(
            (slug) =>
              getAllKeyrackFillTargets({ reaches: keys[slug]?.reaches ?? [] })
                .length,
          )
          .reduce((sum, n) => sum + n, 0);
        expect(count).toEqual(walked);
      });

      then('which is 3 + 1 — each key brings its reachless target', () => {
        expect(count).toEqual(4);
      });
    });

    when('[t1] counted for two owners', () => {
      then('it scales by owner, since fill walks each owner in turn', () => {
        expect(
          getOneKeyrackFillTargetCount({
            slugs,
            keys,
            owners: ['ehmpath', 'vlad'],
          }),
        ).toEqual(8);
      });
    });
  });

  given('[case2] a slug the manifest does not declare', () => {
    when('[t0] counted', () => {
      then(
        'it still brings one target — the reachless key is unconditional',
        () => {
          expect(
            getOneKeyrackFillTargetCount({
              slugs: ['org.test.UNDECLARED'],
              keys: {} as KeyrackRepoManifest['keys'],
              owners: ['ehmpath'],
            }),
          ).toEqual(1);
        },
      );
    });
  });
});
