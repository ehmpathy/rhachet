import { getHomeDir } from '@src/infra/getHomeDir';

import { join } from 'node:path';

/**
 * .what = resolves the host manifest path based on owner
 * .why = enables per-owner isolation with separate manifest files
 *
 * .note = owner null → keyrack.host.age (default)
 * .note = owner explicit → keyrack.host.${owner}.age
 */
export const getKeyrackHostManifestPath = (input: {
  owner: string | null;
}): string => {
  const home = getHomeDir();
  const filename =
    input.owner === null
      ? 'keyrack.host.age'
      : `keyrack.host.${input.owner}.age`;
  return join(home, '.rhachet', 'keyrack', filename);
};

/**
 * .what = resolves the host manifest index path based on owner
 * .why = unencrypted index enables locked/absent detection without manifest decryption
 *
 * .note = owner null → keyrack.host.index.json (default)
 * .note = owner explicit → keyrack.host.${owner}.index.json
 *
 * .security = index contains only slugs, no secrets
 */
export const getKeyrackHostManifestIndexPath = (input: {
  owner: string | null;
}): string => {
  const home = getHomeDir();
  const filename =
    input.owner === null
      ? 'keyrack.host.index.json'
      : `keyrack.host.${input.owner}.index.json`;
  return join(home, '.rhachet', 'keyrack', filename);
};
