import { given, then, when } from 'test-fns';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';

import { getOneKeyrackAwsParamMechForSet } from './getOneKeyrackAwsParamMechForSet';

/**
 * .what = unit clamp for the aws.params set-mech settle
 * .why = an explicit --mech must settle without a reach into the interactive inference — proven
 *        creds-free + prompt-free here. the prompt branch (no mech) runs end-to-end in the CLI
 *        acceptance suite.
 * .scope = internal set-flow helper (NOT a user-faced contract)
 */
describe('getOneKeyrackAwsParamMechForSet', () => {
  // a stand-in vault whose inference would THROW if reached — so a test that settles without a
  // prompt proves it never reached the interactive path
  const vaultThatMustNotPrompt = {
    mechs: {
      supported: ['PERMANENT_VIA_REPLICA', 'EPHEMERAL_VIA_GITHUB_APP'],
    },
  } as unknown as KeyrackHostVaultAdapter;

  given('[case1] an explicit --mech', () => {
    when('[t0] settled', () => {
      then('it returns that mech, no prompt', async () => {
        const mech = await getOneKeyrackAwsParamMechForSet({
          mech: 'EPHEMERAL_VIA_GITHUB_APP',
          vault: vaultThatMustNotPrompt,
        });
        expect(mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
      });
    });
  });
});
