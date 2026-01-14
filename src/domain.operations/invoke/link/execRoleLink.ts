import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { mkdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
  getAgentRepoThisReadmeTemplate,
  getAgentRootReadmeTemplate,
} from '../getAgentReadmeTemplates';
import { findsertFile } from './findsertFile';
import { findsertRepoGitignore } from './findsertRepoGitignore';
import { symlinkReadme } from './symlinkReadme';
import { symlinkResourceDirectories } from './symlinkResourceDirectories';

/**
 * .what = links a role into the .agent directory structure
 * .why = shared link logic for invokeRolesLink and initRolesFromPackages
 *
 * .note = creates .agent/repo=$repo/role=$role structure with symlinks
 */
export const execRoleLink = (input: {
  role: RoleManifest;
  repo: RoleRegistryManifest;
  indent?: string;
}): { briefsCount: number; skillsCount: number; initsCount: number } => {
  // create .agent directory structure
  const agentDir = resolve(process.cwd(), '.agent');
  const repoThisDir = resolve(agentDir, 'repo=.this');
  const repoDir = resolve(agentDir, `repo=${input.repo.slug}`);
  const repoRoleDir = resolve(repoDir, `role=${input.role.slug}`);

  mkdirSync(agentDir, { recursive: true });
  mkdirSync(repoThisDir, { recursive: true });
  mkdirSync(repoDir, { recursive: true });
  mkdirSync(repoRoleDir, { recursive: true });

  // create .gitignore for external repos (not .this)
  if (input.repo.slug !== '.this') {
    findsertRepoGitignore({ repoDir });
  }

  // findsert .agent/readme.md
  findsertFile({
    path: resolve(agentDir, 'readme.md'),
    template: getAgentRootReadmeTemplate(),
  });

  // findsert .agent/repo=.this/readme.md
  findsertFile({
    path: resolve(repoThisDir, 'readme.md'),
    template: getAgentRepoThisReadmeTemplate(),
  });

  // symlink .agent/repo=$repo/readme.md
  if (input.repo.readme?.uri) {
    const targetPath = resolve(repoDir, 'readme.md');
    const relativeTargetPath = relative(process.cwd(), targetPath);
    const { status } = symlinkReadme({
      sourcePath: input.repo.readme.uri,
      targetPath,
    });
    console.log(
      `  ${status === 'updated' ? '↻' : '+'} ${relativeTargetPath}${status === 'updated' ? ' (updated)' : ''}`,
    );
  }

  // symlink .agent/repo=$repo/role=$role/readme.md
  if (input.role.readme?.uri) {
    const targetPath = resolve(repoRoleDir, 'readme.md');
    const relativeTargetPath = relative(process.cwd(), targetPath);
    const { status } = symlinkReadme({
      sourcePath: input.role.readme.uri,
      targetPath,
    });
    console.log(
      `  ${status === 'updated' ? '↻' : '+'} ${relativeTargetPath}${status === 'updated' ? ' (updated)' : ''}`,
    );
  }

  // link briefs
  const briefsCount = symlinkResourceDirectories({
    sourceDirs: input.role.briefs.dirs,
    targetDir: resolve(repoRoleDir, 'briefs'),
    resourceName: 'briefs',
  });

  // link skills
  const skillsCount = symlinkResourceDirectories({
    sourceDirs: input.role.skills.dirs,
    targetDir: resolve(repoRoleDir, 'skills'),
    resourceName: 'skills',
  });

  // link inits if configured
  const initsCount = input.role.inits?.dirs
    ? symlinkResourceDirectories({
        sourceDirs: input.role.inits.dirs,
        targetDir: resolve(repoRoleDir, 'inits'),
        resourceName: 'inits',
      })
    : 0;

  // log tree branches for linked resources
  const indent = input.indent ?? '   ';
  const items = [
    briefsCount > 0 ? `${briefsCount} brief(s)` : null,
    skillsCount > 0 ? `${skillsCount} skill(s)` : null,
    initsCount > 0 ? `${initsCount} init(s)` : null,
  ].filter(Boolean);
  items.forEach((item, idx) => {
    const branch = idx === items.length - 1 ? '└──' : '├──';
    console.log(`${indent}${branch} ${item}`);
  });

  return { briefsCount, skillsCount, initsCount };
};
