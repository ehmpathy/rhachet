import glob from 'fast-glob';

import { asPathsSorted } from './asPathsSorted';

/**
 * .what = every `.agent/repo=.this/role=*` dir of a repo, absolute, in sorted order
 * .why = the stop fingerprint and the owned content scan must reach one role set, so a defect
 *        the scan finds always sits under a dir the fingerprint hashes
 *
 * .note = one level, so no descent and no cycle. a role with no `boot.yml` is still a role dir
 */
export const getAllRepoThisRoleDirs = async (input: {
  cwd: string;
}): Promise<string[]> =>
  asPathsSorted({
    paths: await glob(['.agent/repo=.this/role=*'], {
      cwd: input.cwd,
      absolute: true,
      onlyDirectories: true,
      dot: true,
      deep: 1,
    }),
  });
