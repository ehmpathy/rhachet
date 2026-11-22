import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { asRoleContentDefectsOfRoleDir } from './asRoleContentDefectsOfRoleDir';
import { asRoleSlugOfRoleDir } from './asRoleSlugOfRoleDir';
import { getAllRepoThisRoleDirs } from './getAllRepoThisRoleDirs';
import { getOneRoleContentDefectsOrNone } from './getOneRoleContentDefectsOrNone';

/**
 * .what = every content defect in this repo's own `.agent/repo=.this` roles
 * .why = a clone birth sets a content defect aside so the clone is born; the stop is where an
 *        owned defect is held, so the clone that can repair it does so before it stops
 *        (`rule.forbid.content-checks-that-halt-enroll`)
 *
 * .note = every `.this` role dir is walked, spec or no spec — the dirs the stop fingerprint hashes.
 *   a dir with no spec boots in no actor, so only the defects a file set owes hold there
 *   (`asRoleContentDefectsOfRoleDir`)
 */
export const getAllRepoThisRoleContentDefects = async (input: {
  cwd: string;
}): Promise<RoleContentDefect[]> => {
  // render each role whole, and keep only what it set aside
  const dirsRole = await getAllRepoThisRoleDirs({ cwd: input.cwd });
  const defectsByRole = await Promise.all(
    dirsRole.map(async (dir) =>
      asRoleContentDefectsOfRoleDir({
        defects: await getOneRoleContentDefectsOrNone({
          ref: { repo: '.this', role: asRoleSlugOfRoleDir({ dir }) },
          cwd: input.cwd,
        }),
        isRoleBooted: existsSync(join(dir, 'boot.yml')),
      }),
    ),
  );
  return defectsByRole.flat();
};
