import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
  KeyrackKeyHost,
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
    mech: KeyrackGrantMechanism;
    secret?: string | null;
    exid?: string | null;
    vaultRecipient?: string | null;
    maxDuration?: string | null;
    repoManifest?: KeyrackRepoManifest;
    at?: string | null;
  },
  context: ContextKeyrack,
): Promise<{
  results: KeyrackKeyHost[];
}> => {
  // compute target slug (no expansion — env=all stores once under $org.all.$key)
  const targetSlugs = [`${input.org}.${input.env}.${input.key}`];

  // set host config for each target slug
  const results: KeyrackKeyHost[] = [];

  for (const slug of targetSlugs) {
    // delegate to setKeyrackKeyHost (manifest write + vault write + repo manifest write)
    const keyHost = await setKeyrackKeyHost(
      {
        slug,
        mech: input.mech,
        vault: input.vault,
        secret: input.secret ?? null,
        exid: input.exid ?? null,
        env: input.env,
        org: input.org,
        vaultRecipient: input.vaultRecipient ?? null,
        maxDuration: input.maxDuration ?? null,
        at: input.at ?? null,
      },
      context,
    );

    results.push(keyHost);
  }

  return { results };
};
