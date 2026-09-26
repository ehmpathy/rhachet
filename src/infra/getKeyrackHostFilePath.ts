import { getHomeDir } from '@src/infra/getHomeDir';

import { join } from 'node:path';

/**
 * .what = derive a per-owner keyrack host file path (the `keyrack.host[.owner]`
 *         family under ~/.rhachet/keyrack/), given the file's suffix
 * .why = the manifest and its index share one on-disk shape:
 *        `keyrack.host` + (owner ? `.${owner}` : '') + suffix.
 *        one builder keeps the null-owner convention + root dir in lockstep across
 *        every keyrack host file, so a convention change can never drift between
 *        hand-maintained copies
 *
 * .note = infra (cross-layer), so both access/daos and domain.operations may
 *         depend on it without a directional-deps violation
 * .note = owner null → keyrack.host{suffix}; owner explicit → keyrack.host.${owner}{suffix}
 */
export const getKeyrackHostFilePath = (input: {
  owner: string | null;
  suffix: string;
}): string => {
  const ownerPart = input.owner === null ? '' : `.${input.owner}`;
  const filename = `keyrack.host${ownerPart}${input.suffix}`;
  return join(getHomeDir(), '.rhachet', 'keyrack', filename);
};
