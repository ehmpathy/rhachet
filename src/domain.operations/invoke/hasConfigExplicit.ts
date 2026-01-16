import { getGitRepoRoot } from 'rhachet-artifact-git';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = checks if rhachet.use.ts config file exists
 * .why = enables fallback to getRoleRegistriesByConfigImplicit when config absent
 */
export const hasConfigExplicit = async (input: {
  from: string;
}): Promise<boolean> => {
  const gitRoot = await getGitRepoRoot({ from: input.from });
  const configPath = resolve(gitRoot, 'rhachet.use.ts');
  return existsSync(configPath);
};
