import { asKeyrackKeyEnv } from './asKeyrackKeyEnv';
import { asKeyrackKeyName } from './asKeyrackKeyName';
import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';

/**
 * .what = extract org, env, and keyName from slug
 * .why = vaults need these parts to construct KeyrackKeyGrant
 */
export const asKeyrackSlugParts = (input: {
  slug: string;
}): { org: string; env: string; keyName: string } => {
  const org = asKeyrackKeyOrg({ slug: input.slug });
  const env = asKeyrackKeyEnv({ slug: input.slug });
  const keyName = asKeyrackKeyName({ slug: input.slug });
  return { org, env, keyName };
};
