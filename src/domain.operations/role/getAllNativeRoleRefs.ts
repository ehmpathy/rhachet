import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { getNativeRoleSlugs } from './getNativeRoleSlugs';

/**
 * .what = each native `.this` role that declares a `boot.yml`, sorted by slug
 * .why = the spec is the opt-in: a `.this` role dir with no spec is a folder of notes, never a
 *        booted role
 */
export const getAllNativeRoleRefs = (
  _input: Record<string, never>,
  context: ContextCli,
): RoleLinkRef[] => {
  const repoThisDir = join(context.cwd, '.agent', 'repo=.this');
  return getNativeRoleSlugs({}, context)
    .filter(
      // probe the closed absence set; an unreadable path raises, never drops the role
      (role) =>
        !!statSync(join(repoThisDir, `role=${role}`, 'boot.yml'), {
          throwIfNoEntry: false,
        }),
    )
    .sort()
    .map((role) => ({ repo: '.this', role }));
};
