import { genTempDir } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = a temp repo whose `.agent/actors.yml` holds the given content, or none
 * .why = every reader of the manifest is tested against a real file in a real repo dir
 */
export const genSampleRepoWithActorsYml = (input: {
  slug: string;
  content: string | null;
}): string => {
  const repoPath = genTempDir({ slug: input.slug });
  mkdirSync(join(repoPath, '.agent'), { recursive: true });
  if (input.content !== null)
    writeFileSync(join(repoPath, '.agent', 'actors.yml'), input.content);
  return repoPath;
};
