import { UnexpectedCodePathError } from 'helpful-errors';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
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
 * .note = roundtrip validation ensures pit of success:
 *   - if setKeyrackKey succeeds, the key is guaranteed to work
 *   - for aws.iam.sso: triggers one-time OAuth registration at setup
 */
export const setKeyrackKey = async (
  input: {
    key: string;
    env: string;
    org: string;
    vault: KeyrackHostVault;
    mech: KeyrackGrantMechanism;
    exid?: string;
    repoManifest?: KeyrackRepoManifest;
    gitroot?: string;
  },
  context: KeyrackHostContext,
): Promise<{
  results: Array<{ slug: string; vault: string; mech: string }>;
  roundtripValidated: boolean;
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
  const results: Array<{ slug: string; vault: string; mech: string }> = [];
  let roundtripValidated = false;

  for (const slug of targetSlugs) {
    // update host manifest
    const keyHost = await setKeyrackKeyHost(
      {
        slug,
        mech: input.mech,
        vault: input.vault,
        exid: input.exid,
      },
      context,
    );

    // store value in vault (for vaults that store values, not just references)
    // aws.iam.sso vault needs the profile name stored so get() can retrieve it
    if (input.vault === 'aws.iam.sso' && input.exid) {
      await context.vaultAdapters['aws.iam.sso'].set({
        slug,
        value: input.exid,
      });

      // roundtrip validation: pit of success guarantee
      // 1. unlock - prove unlock works (triggers OAuth registration for aws.iam.sso)
      await context.vaultAdapters['aws.iam.sso'].unlock({});

      // 2. get - prove get works, verify value matches what we set
      const valueRead = await context.vaultAdapters['aws.iam.sso'].get({
        slug,
      });
      if (valueRead !== input.exid) {
        throw new UnexpectedCodePathError(
          'roundtrip failed: get returned different value',
          {
            slug,
            expected: input.exid,
            actual: valueRead,
          },
        );
      }

      // 3. relock - clear session, leave vault in locked state after setup
      await context.vaultAdapters['aws.iam.sso'].relock?.({ slug });

      roundtripValidated = true;
    }

    results.push({ slug, vault: keyHost.vault, mech: keyHost.mech });
  }

  // register key in repo manifest (findsert: adds if not present)
  // note: only register for specific env (skip when env='all')
  if (input.env !== 'all' && input.gitroot) {
    await daoKeyrackRepoManifest.set({
      gitroot: input.gitroot,
      env: input.env,
      keyName: input.key,
    });
  }

  return { results, roundtripValidated };
};
