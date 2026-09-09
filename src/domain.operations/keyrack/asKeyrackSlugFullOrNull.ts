import { isValidKeyrackEnv } from './constants';

/**
 * .what = decode a key as a FULL slug (`org.env.keyName`), or null when it is a bare key name
 * .why = the cli accepts both spellings, and which one a caller used decides whether the key
 *        is SELF-DESCRIBING (it names its own org) or DEFERS to the `--org` flag. that fork
 *        governs whether a manifest must load, so it needs exactly one definition
 *
 * .note = the env segment must be a VALID env, which is what keeps a dotted key name from a
 *         misread — `my.api.KEY` is a bare key, not an org `my` in env `api`
 */
export const asKeyrackSlugFullOrNull = (input: {
  key: string;
}): { org: string; env: string; keyName: string } | null => {
  const parts = input.key.split('.');
  if (parts.length < 3) return null;

  const org = parts[0]!;
  const env = parts[1]!;
  const keyName = parts.slice(2).join('.');

  // must have valid env to be a full slug
  if (!isValidKeyrackEnv(env)) return null;

  return { org, env, keyName };
};
