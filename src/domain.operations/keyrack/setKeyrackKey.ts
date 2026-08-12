import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
  KeyrackKeyHost,
  KeyrackKeyReach,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import type { ContextKeyrack } from './genContextKeyrack';
import { setKeyrackKeyHost } from './setKeyrackKeyHost';

/**
 * .what = orchestrates the full keyrack set flow
 * .why = single domain operation for CLI to call (layer separation)
 *
 * .note = delegates vault storage and roundtrip validation to vault adapters
 * .note = env=all stores once under $org.all.$key (no expansion)
 */
export const setKeyrackKey = async (
  input: {
    key: string;
    env: string;
    org: string;
    vault: KeyrackHostVault;
    mech?: KeyrackGrantMechanism | null;
    secret?: string | null;
    exid?: string | null;
    reach?: KeyrackKeyReach;
    maxDuration?: string | null;
    repoManifest?: KeyrackRepoManifest;
    at?: string | null;
  },
  context: ContextKeyrack,
): Promise<KeyrackKeyHost[]> => {
  // compute target slug (no expansion — env=all stores once under $org.all.$key)
  const targetSlugs = [`${input.org}.${input.env}.${input.key}`];

  // set host config for each target slug — a functional map (no mutable accumulator)
  const results = await Promise.all(
    targetSlugs.map(async (slug) => {
      // delegate to setKeyrackKeyHost (manifest write + vault write + repo manifest write)
      return await setKeyrackKeyHost(
        {
          slug,
          mech: input.mech,
          vault: input.vault,
          secret: input.secret ?? null,
          exid: input.exid ?? null,
          // .note = the reach does NOT enter the slug. the slug stays `$org.$env.$key`, so
          //         provenance is untouched and the repo-manifest gate still passes — that
          //         single axis of difference is what makes this design work where a
          //         destination-in-the-slug design would trip the gate and overload `org`
          reach: input.reach,
          env: input.env,
          org: input.org,
          maxDuration: input.maxDuration ?? null,
          at: input.at ?? null,
        },
        context,
      );
    }),
  );

  return results;
};
