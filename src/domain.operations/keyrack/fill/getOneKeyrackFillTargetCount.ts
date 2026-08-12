import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { getAllKeyrackFillTargets } from './getAllKeyrackFillTargets';

/**
 * .what = how many reaches `fill` will provision across the given keys and owners
 * .why = the denominator of `fill`'s progress line. it derives from the SAME
 *        `getAllKeyrackFillTargets` the provision loop walks, so a total and the work it
 *        describes cannot disagree — a count with its own arithmetic could
 *
 * .note = a slug absent from the manifest still contributes its reachless target, which
 *         matches the loop: the reachless key is unconditional
 */
export const getOneKeyrackFillTargetCount = (input: {
  slugs: string[];
  keys: KeyrackRepoManifest['keys'];
  owners: unknown[];
}): number => {
  const perOwner = input.slugs
    .map(
      (slug) =>
        getAllKeyrackFillTargets({ reaches: input.keys[slug]?.reaches ?? [] })
          .length,
    )
    .reduce((sum, count) => sum + count, 0);

  return perOwner * input.owners.length;
};
