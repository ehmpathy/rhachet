import { UnexpectedCodePathError } from 'helpful-errors';

import { join } from 'node:path';

/**
 * .what = resolves the home directory
 * .why = uses HOME env var to support test isolation
 *
 * .note = os.homedir() caches at module load; we read process.env.HOME directly
 */
const getHomeDir = (): string => {
  const home = process.env.HOME;
  if (!home) throw new UnexpectedCodePathError('HOME not set', {});
  return home;
};

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
