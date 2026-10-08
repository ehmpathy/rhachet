import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { discoverLinkedRoles } from '@src/domain.operations/upgrade/discoverLinkedRoles';

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { asRoleRefsFirstSeenPerRole } from './asRoleRefsFirstSeenPerRole';
import { getNativeRoleSlugs } from './getNativeRoleSlugs';

/**
 * .what = every role linked under `.agent/`, native `.this` roles first, one ref per slug
 * .why = the one read of the linked set: enroll takes it as its default roleset, and a
 *        brain dir render looks its roles up in it
 *
 * .note = a native role joins the set only when it declares a `boot.yml`. the spec is the
 *   opt-in: a `.this` role dir with no spec is a folder of notes, never a booted role. the
 *   same spec is where the role opts into its budget, so one file marks a role as live
 * .note = package repos are read in code-unit order, so "first seen" is the same on any fs
 */
export const getAllLinkedRoleRefs = (
  _input: Record<string, never>,
  context: ContextCli,
): RoleLinkRef[] => {
  const repoThisDir = join(context.cwd, '.agent', 'repo=.this');
  const refsNative = getNativeRoleSlugs({}, context)
    .filter(
      // probe the closed absence set; an unreadable path raises, never drops the role
      (role) =>
        !!statSync(join(repoThisDir, `role=${role}`, 'boot.yml'), {
          throwIfNoEntry: false,
        }),
    )
    .sort()
    .map((role) => ({ repo: '.this', role }));
  // a three-way code-point compare: equal keys return 0, so the sort is consistent
  const refsPackage = discoverLinkedRoles({}, context).sort((a, b) => {
    const keyA = `${a.repo}/${a.role}`;
    const keyB = `${b.repo}/${b.role}`;
    if (keyA === keyB) return 0;
    return keyA < keyB ? -1 : 1;
  });
  return asRoleRefsFirstSeenPerRole({ refs: [...refsNative, ...refsPackage] });
};
