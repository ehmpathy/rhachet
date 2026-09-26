import { getKeyrackHostFilePath } from '@src/infra/getKeyrackHostFilePath';

/**
 * .what = derive the host manifest path based on owner
 * .why = enables per-owner isolation with separate manifest files
 *
 * .note = owner null → keyrack.host.age (default)
 * .note = owner explicit → keyrack.host.${owner}.age
 */
export const getKeyrackHostManifestPath = (input: {
  owner: string | null;
}): string => getKeyrackHostFilePath({ owner: input.owner, suffix: '.age' });
