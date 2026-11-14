import { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { getAllRoleModEntries } from '@src/domain.operations/role/getAllRoleModEntries';
import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';

import { basename, join } from 'node:path';
import { getOneRoleModState } from './getOneRoleModState';

/**
 * .what = whether a role-relative skill path names the skill of the given slug
 * .why = a skill file may carry `.sh` or no extension, and may sit in a nested dir
 */
const isSkillPathOfSlug = (input: { path: string; slug: string }): boolean => {
  if (!input.path.startsWith('skills/')) return false;
  const name = basename(input.path);
  return name === input.slug || name === `${input.slug}.sh`;
};

/**
 * .what = each mod that `not`s a skill of the given slug: the role it mods, and the path it nots
 * .why = a `run --skill` of a skill a mod `not`ed finds no match; the refusal must name the
 *        mod's `not:` as the cause, never a bare "not found" that teaches a relink (usecase 9)
 *
 * .note = a mod whose boot.yml never names the slug cannot `not` it, so it is never derived;
 *   an unrelated mod, sound or refused, stays out of the skill's refusal
 */
export const getAllRoleModNotsOfSkill = (input: {
  cwd: string;
  slugSkill: string;
  slugRole: string | null;
}): {
  role: string;
  target: RoleLinkRef;
  path: string;
  modSpecPath: string;
}[] => {
  const { modsDir, slugs } = getAllRoleModEntries({ cwd: input.cwd });
  const slugsNamed = slugs
    .filter((role) => input.slugRole === null || role === input.slugRole)
    .filter((role) => {
      const content = getFileContentOrNull({
        path: join(modsDir, `role=${role}`, 'boot.yml'),
      });
      return content !== null && content.includes(input.slugSkill);
    });
  if (slugsNamed.length === 0) return [];

  // derive each named mod's plan, and keep the nots of this skill
  const refsLinked = getAllLinkedRoleRefs(
    {},
    new ContextCli({ cwd: input.cwd, gitroot: input.cwd }),
  );
  return slugsNamed.flatMap((role) => {
    const { target, plan } = getOneRoleModState({
      cwd: input.cwd,
      role,
      refsLinked,
    });
    return plan.nots
      .filter((path) => isSkillPathOfSlug({ path, slug: input.slugSkill }))
      .map((path) => ({
        role,
        target,
        path,
        modSpecPath: `.agent/repo=.mods/role=${role}/boot.yml`,
      }));
  });
};
