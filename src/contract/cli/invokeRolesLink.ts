import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/contract/sdk';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';
import {
  getAgentRepoThisReadmeTemplate,
  getAgentRootReadmeTemplate,
} from '@src/domain.operations/invoke/getAgentReadmeTemplates';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';
import { findsertFile } from '@src/domain.operations/invoke/link/findsertFile';
import { symlinkReadme } from '@src/domain.operations/invoke/link/symlinkReadme';
import { symlinkResourceDirectories } from '@src/domain.operations/invoke/link/symlinkResourceDirectories';

import { mkdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = adds the "roles link" subcommand to the CLI
 * .why = creates .agent/ directory structure and links role resources
 * .how = findserts standard readmes and symlinks briefs and skills
 */
export const invokeRolesLink = ({
  command,
  registries,
}: {
  command: Command;
  registries: RoleRegistry[];
}): void => {
  command
    .command('link')
    .description('link role resources into .agent/ directory structure')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to link resources for')
    .action((opts: { repo?: string; role?: string }) => {
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const role = assureFindRole({ registries, slug: opts.role });
      const repo = opts.repo
        ? registries.find((r) => r.slug === opts.repo)
        : inferRepoByRole({ registries, slugRole: opts.role });
      if (!repo)
        BadRequestError.throw(`No repo found with slug "${opts.repo}"`);

      console.log(``);
      console.log(`🔗 Linking role "${role.slug}" from repo "${repo.slug}"...`);
      console.log(``);

      // Create .agent directory structure
      const agentDir = resolve(process.cwd(), '.agent');
      const repoThisDir = resolve(agentDir, 'repo=.this');
      const repoRoleDir = resolve(
        agentDir,
        `repo=${repo.slug}`,
        `role=${role.slug}`,
      );

      const repoDir = resolve(agentDir, `repo=${repo.slug}`);

      mkdirSync(agentDir, { recursive: true });
      mkdirSync(repoThisDir, { recursive: true });
      mkdirSync(repoDir, { recursive: true });
      mkdirSync(repoRoleDir, { recursive: true });

      // Findsert .agent/readme.md
      findsertFile({
        path: resolve(agentDir, 'readme.md'),
        template: getAgentRootReadmeTemplate(),
      });

      // Findsert .agent/repo=.this/readme.md
      findsertFile({
        path: resolve(repoThisDir, 'readme.md'),
        template: getAgentRepoThisReadmeTemplate(),
      });

      // Symlink .agent/repo=$repo/readme.md
      if (repo.readme?.uri) {
        const targetPath = resolve(repoDir, 'readme.md');
        const relativeTargetPath = relative(process.cwd(), targetPath);
        const { status } = symlinkReadme({
          sourcePath: repo.readme.uri,
          targetPath,
        });
        console.log(
          `  ${status === 'updated' ? '↻' : '+'} ${relativeTargetPath}${status === 'updated' ? ' (updated)' : ''}`,
        );
      }

      // Symlink .agent/repo=$repo/role=$role/readme.md
      if (role.readme?.uri) {
        const targetPath = resolve(repoRoleDir, 'readme.md');
        const relativeTargetPath = relative(process.cwd(), targetPath);
        const { status } = symlinkReadme({
          sourcePath: role.readme.uri,
          targetPath,
        });
        console.log(
          `  ${status === 'updated' ? '↻' : '+'} ${relativeTargetPath}${status === 'updated' ? ' (updated)' : ''}`,
        );
      }

      // Link briefs if configured
      const briefsCount = symlinkResourceDirectories({
        sourceDirs: role.briefs.dirs,
        targetDir: resolve(repoRoleDir, 'briefs'),
        resourceName: 'briefs',
      });

      // Link skills if configured
      const skillsCount = symlinkResourceDirectories({
        sourceDirs: role.skills.dirs,
        targetDir: resolve(repoRoleDir, 'skills'),
        resourceName: 'skills',
      });

      // Link inits if configured
      const initsCount = role.inits?.dirs
        ? symlinkResourceDirectories({
            sourceDirs: role.inits.dirs,
            targetDir: resolve(repoRoleDir, 'inits'),
            resourceName: 'inits',
          })
        : 0;

      console.log(``);
      console.log(`🔗 Linked role "${role.slug}" from repo "${repo.slug}"`);
      if (briefsCount > 0) console.log(`  - ${briefsCount} brief(s) linked`);
      if (skillsCount > 0) console.log(`  - ${skillsCount} skill(s) linked`);
      if (initsCount > 0) console.log(`  - ${initsCount} init(s) linked`);
      console.log(``);
    });
};
