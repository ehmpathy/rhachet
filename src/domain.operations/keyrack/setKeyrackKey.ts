import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
  KeyrackKeyHost,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { asKeyrackKeyName } from './asKeyrackKeyName';
import type { KeyrackHostContext } from './genKeyrackHostContext';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';
import { setKeyrackKeyHost } from './setKeyrackKeyHost';

/**
 * .what = orchestrates the full keyrack set flow
 * .why = single domain operation for CLI to call (layer separation)
 *
 * .note = delegates vault storage and roundtrip validation to vault adapters
 * .note = handles env=all expansion into per-env slugs
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
  },
  context: KeyrackHostContext,
): Promise<{
  results: KeyrackKeyHost[];
}> => {
  // compute target slugs based on env
  const targetSlugs: string[] = (() => {
    if (input.env === 'all' && input.repoManifest) {
      // expand to all envs that declare this key
      return getAllKeyrackSlugsForEnv({
        manifest: input.repoManifest,
        env: 'all',
      }).filter((s) => asKeyrackKeyName({ slug: s }) === input.key);
    }
    return [`${input.org}.${input.env}.${input.key}`];
  })();

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
      },
      context,
    );

    results.push(keyHost);
  }

  return { results };
};
