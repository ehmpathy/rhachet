import { discoverInitExecutables } from '@src/domain.operations/invoke/discoverInitExecutables';
import { discoverSkillExecutables } from '@src/domain.operations/invoke/discoverSkillExecutables';

import { relative } from 'node:path';

/**
 * .what = every linked role file of one kind (skills or inits) whose slug matches, under a repo
 * .why = the hook dispatcher runs the file an `rhx` command would have run, so it asks the same
 *   lookup `rhx` asks (`discoverSkillExecutables`, `discoverInitExecutables`), rooted at the repo
 *   the sync targets rather than the process cwd
 *
 * .note = paths come back relative to the repo root
 */
export const getAllRoleExecutablesBySlug = (input: {
  repoPath: string;
  dir: 'skills' | 'inits';
  slug: string;
  slugRepo: string | null;
  slugRole: string | null;
}): Array<{ path: string; slugRepo: string; slugRole: string }> => {
  const filter = {
    repoPath: input.repoPath,
    slugRepo: input.slugRepo ?? undefined,
    slugRole: input.slugRole ?? undefined,
  };
  const found =
    input.dir === 'skills'
      ? discoverSkillExecutables({ ...filter, slugSkill: input.slug })
      : discoverInitExecutables({ ...filter, slugInit: input.slug });
  return found.map((executable) => ({
    path: relative(input.repoPath, executable.path),
    slugRepo: executable.slugRepo,
    slugRole: executable.slugRole,
  }));
};
