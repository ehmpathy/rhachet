import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';
import { asRoleModDir } from '@src/domain.operations/role/asRoleModDir';
import { getAllRepoDirsOfKind } from '@src/domain.operations/role/getAllRepoDirsOfKind';
import { asPathRelPosix } from '@src/infra/filesystem/asPathRelPosix';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';
import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { asRoleModRefusalError } from './asRoleModRefusalError';
import { isRoleModFileLitter } from './isRoleModFileLitter';
import { parseRoleModBootYaml } from './parseRoleModBootYaml';

/**
 * .what = whether a mod-relative path is the mod's own spec
 * .why = the spec names the role the mod is over; it ships no resource
 */
const isSpecPath = (input: { path: string }): boolean =>
  input.path === 'boot.yml';

/**
 * .what = each linked package repo that holds a role of the given slug, by repo slug
 * .why = those repos are the legal `of:` values a mod of that slug may name
 */
const getAllLinkedReposOfRole = (input: {
  cwd: string;
  role: string;
}): string[] => {
  const agentDir = join(input.cwd, '.agent');
  return getAllRepoDirsOfKind({ agentDir, kinds: ['package'] })
    .filter((repoDir) =>
      existsSync(join(agentDir, repoDir, `role=${input.role}`)),
    )
    .map((repoDir) => repoDir.replace('repo=', ''));
};

/**
 * .what = one mod's parsed boot.yml, and every file it ships by its role-relative path
 * .why = the spec and the files are the two inputs of the plan, read in one place
 *
 * .note = a mod dir with no boot.yml is refused: it names no role, so it cannot be applied
 */
export const getOneRoleModSpec = (input: {
  cwd: string;
  role: string;
}): { modDir: string; spec: RoleModSpec; filesMod: string[] } => {
  const modDir = asRoleModDir({ cwd: input.cwd, role: input.role });
  const pathToSpec = join(modDir, 'boot.yml');

  // the boot.yml names the role the mod is over
  const content = getFileContentOrNull({ path: pathToSpec });
  if (content === null)
    throw asRoleModRefusalError({
      role: input.role,
      problem: 'it holds no boot.yml',
      subject: 'boot.yml',
      nearest: null,
      fix: `add .agent/repo=.mods/role=${input.role}/boot.yml with \`of: <repo>/${input.role}\``,
    });
  const spec = parseRoleModBootYaml({
    content,
    path: pathToSpec,
    roleDir: input.role,
    reposLinked: getAllLinkedReposOfRole({ cwd: input.cwd, role: input.role }),
  });

  // every file the mod dir holds, by its path relative to the mod dir
  const filesRel = getAllFilesFromDir({ dir: modDir }).map((file) =>
    asPathRelPosix({ from: modDir, to: file }),
  );

  // every file but the spec and an os or editor leftover is a resource the mod ships
  const filesMod = filesRel
    .filter((path) => !isSpecPath({ path }))
    .filter((path) => !isRoleModFileLitter({ path }))
    .sort();

  return { modDir, spec, filesMod };
};
