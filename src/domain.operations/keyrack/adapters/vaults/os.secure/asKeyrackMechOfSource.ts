import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack';
import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';
import { inferKeyrackMechForGet } from '@src/domain.operations/keyrack/inferKeyrackMechForGet';

/**
 * .what = the mech a stored or piped source names: the mech the blob declares, else github-app
 *         when the blob passes the github-app shape check, else replica
 * .why = one rule, one home. set (to infer and to check agreement) and get (to infer when the
 *        manifest names none) must read a mech-less github-app blob the same way, or `get` reads
 *        it as a replica and hands the private key out as the token
 */
export const asKeyrackMechOfSource = (input: {
  source: string;
}): KeyrackGrantMechanism => {
  // the mech the blob declares
  const mechNamed = inferKeyrackMechForGet({ value: input.source });
  if (mechNamed !== 'PERMANENT_VIA_REPLICA') return mechNamed;

  // a github-app blob that declares no mech
  if (mechAdapterGithubApp.validate({ source: input.source }).valid)
    return 'EPHEMERAL_VIA_GITHUB_APP';

  // a plain value
  return 'PERMANENT_VIA_REPLICA';
};
