import type {
  KeyrackKeyReach,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { getAllKeyrackFillTargets } from './fill/getAllKeyrackFillTargets';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';

/**
 * .what = one (key × reach) pair a repo sweep must ask for
 * .why = a slug alone cannot address a key once reach is an identity axis — two reaches
 *        of one slug were never one key, so a sweep that walks slugs walks past every
 *        reach but the reachless one
 *
 * .note = `reach` is absent — never null — on the reachless target, matching the optional
 *         `reach?` every address contract in keyrack carries (e16)
 */
export interface KeyrackSweepTarget {
  slug: string;
  reach?: KeyrackKeyReach;
}

/**
 * .what = every (key × reach) pair a repo declares for one env
 * .why = `get --for repo` must SEE every reach it holds. a sweep keyed by slug alone
 *        returns only the reachless credential and reports not one word about the
 *        reaches held beside it — a silence a human reads as completeness
 *
 * .note = the per-key expansion is `getAllKeyrackFillTargets`, deliberately reused rather
 *         than re-derived: `fill` provisions the targets and the sweep reads them back, so
 *         a second encoding of "the reachless target, then each declared reach" could drift
 *         and the drift would show as a reach filled yet never swept
 * .note = a repo declares a MINIMUM (`KeyrackKeySpec.reaches`), so this enumerates what the
 *         repo ASKED for, never what the host happens to hold. a reach a human holds
 *         off-manifest is theirs to name with `--key`/`--reach`; a repo sweep cannot guess it
 */
export const getAllKeyrackSweepTargetsForEnv = (input: {
  manifest: KeyrackRepoManifest;
  env: string;
}): KeyrackSweepTarget[] =>
  getAllKeyrackSlugsForEnv({
    manifest: input.manifest,
    env: input.env,
  }).flatMap((slug) =>
    getAllKeyrackFillTargets({
      reaches: input.manifest.keys[slug]?.reaches ?? [],
    }).map((target) => ({ slug, ...target })),
  );
