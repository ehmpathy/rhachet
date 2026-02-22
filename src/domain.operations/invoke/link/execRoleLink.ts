import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import {
  getAgentRepoThisReadmeTemplate,
  getAgentRootReadmeTemplate,
} from '@src/domain.operations/invoke/getAgentReadmeTemplates';

import { mkdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { findsertFile, type LinkResult } from './findsertFile';
import { findsertRepoGitignore } from './findsertRepoGitignore';
import { symlinkReadme } from './symlinkReadme';
import { symlinkResourceDirectories } from './symlinkResourceDirectories';

/**
 * .what = formats a link result for display
 * .why = consistent status symbols across all link operations
 */
const formatLinkResult = (result: LinkResult): string => {
  const symbol =
    result.status === 'created'
      ? '+'
      : result.status === 'unchanged'
        ? '✓'
        : result.status === 'removed'
          ? '-'
          : '↻';
  const suffix =
    result.status === 'created'
      ? ''
      : result.status === 'unchanged'
        ? ' (unchanged)'
        : result.status === 'removed'
          ? ' (removed)'
          : ' (updated)';
  return `${symbol} ${result.path}${suffix}`;
};

/**
 * .what = links a role into the .agent directory structure
 * .why = shared link logic for invokeRolesLink and initRolesFromPackages
 *
 * .note = creates .agent/repo=$repo/role=$role structure with symlinks
 * .note = prints tree with two branches: links and stats
 */
export const execRoleLink = (
  input: {
    role: RoleManifest;
    repo: RoleRegistryManifest;
  },
  context: ContextCli,
): { briefsCount: number; skillsCount: number; initsCount: number } => {
  // log which role is being linked
  console.log(`📚 link role repo=${input.repo.slug}/role=${input.role.slug}`);

  // collect all link results for tree output
  const linkResults: LinkResult[] = [];

  // create .agent directory structure
  const agentDir = resolve(process.cwd(), '.agent');
  const repoThisDir = resolve(agentDir, 'repo=.this');
  const repoDir = resolve(agentDir, `repo=${input.repo.slug}`);
  const repoRoleDir = resolve(repoDir, `role=${input.role.slug}`);

  mkdirSync(agentDir, { recursive: true });
  mkdirSync(repoThisDir, { recursive: true });
  mkdirSync(repoDir, { recursive: true });
  mkdirSync(repoRoleDir, { recursive: true });

  // findsert .agent/readme.md
  linkResults.push(
    findsertFile({
      path: resolve(agentDir, 'readme.md'),
      template: getAgentRootReadmeTemplate(),
    }),
  );

  // findsert .agent/repo=.this/readme.md
  linkResults.push(
    findsertFile({
      path: resolve(repoThisDir, 'readme.md'),
      template: getAgentRepoThisReadmeTemplate(),
    }),
  );

  // symlink .agent/repo=$repo/readme.md
  if (input.repo.readme?.uri) {
    const targetPath = resolve(repoDir, 'readme.md');
    const relativeTargetPath = relative(process.cwd(), targetPath);
    const { status } = symlinkReadme({
      sourcePath: input.repo.readme.uri,
      targetPath,
    });
    linkResults.push({ path: relativeTargetPath, status });
  }

  // findsert .agent/repo=$repo/.gitignore for external repos (not .this)
  if (input.repo.slug !== '.this') {
    linkResults.push(findsertRepoGitignore({ repoDir }));
  }

  // symlink .agent/repo=$repo/role=$role/readme.md
  if (input.role.readme?.uri) {
    const targetPath = resolve(repoRoleDir, 'readme.md');
    const relativeTargetPath = relative(process.cwd(), targetPath);
    const { status } = symlinkReadme({
      sourcePath: input.role.readme.uri,
      targetPath,
    });
    linkResults.push({ path: relativeTargetPath, status });
  }

  // link briefs
  const briefs = symlinkResourceDirectories(
    {
      sourceDirs: input.role.briefs.dirs,
      targetDir: resolve(repoRoleDir, 'briefs'),
      resourceName: 'briefs',
    },
    context,
  );
  linkResults.push(...briefs.results);

  // link skills
  const skills = symlinkResourceDirectories(
    {
      sourceDirs: input.role.skills.dirs,
      targetDir: resolve(repoRoleDir, 'skills'),
      resourceName: 'skills',
    },
    context,
  );
  linkResults.push(...skills.results);

  // link inits if configured
  const inits = input.role.inits?.dirs
    ? symlinkResourceDirectories(
        {
          sourceDirs: input.role.inits.dirs,
          targetDir: resolve(repoRoleDir, 'inits'),
          resourceName: 'inits',
        },
        context,
      )
    : { fileCount: 0, results: [] };
  linkResults.push(...inits.results);

  // build stats items
  const statsItems = [
    briefs.fileCount > 0 ? `${briefs.fileCount} brief(s)` : null,
    skills.fileCount > 0 ? `${skills.fileCount} skill(s)` : null,
    inits.fileCount > 0 ? `${inits.fileCount} init(s)` : null,
  ].filter(Boolean) as string[];

  // print tree with two branches: links and stats
  console.log(`   ├─ links`);
  linkResults.forEach((result, idx) => {
    const isLast = idx === linkResults.length - 1;
    const branch = isLast ? '└──' : '├──';
    const connector = statsItems.length > 0 ? '│' : ' ';
    console.log(`   ${connector}  ${branch} ${formatLinkResult(result)}`);
  });

  if (statsItems.length > 0) {
    console.log(`   └─ stats`);
    statsItems.forEach((item, idx) => {
      const branch = idx === statsItems.length - 1 ? '└──' : '├──';
      console.log(`       ${branch} ${item}`);
    });
  }

  // blank line after link block for visual separation
  console.log('');

  return {
    briefsCount: briefs.fileCount,
    skillsCount: skills.fileCount,
    initsCount: inits.fileCount,
  };
};
