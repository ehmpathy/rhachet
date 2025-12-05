import { mkdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { assureFindRole } from '../../logic/invoke/assureFindRole';
import {
  getAgentRepoThisReadmeTemplate,
  getAgentRootReadmeTemplate,
} from '../../logic/invoke/getAgentReadmeTemplates';
import { findsertFile } from '../../logic/invoke/link/findsertFile';
import { symlinkResourceDirectories } from '../../logic/invoke/link/symlinkResourceDirectories';
import type { RoleRegistry } from '../sdk';

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
      if (!opts.repo)
        BadRequestError.throw('--repo is required (e.g., --repo ehmpathy)');
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const repoSlug = opts.repo;
      const role = assureFindRole({ registries, slug: opts.role });

      console.log(``);
      console.log(`🔗 Linking role "${role.slug}" from repo "${repoSlug}"...`);
      console.log(``);

      // Create .agent directory structure
      const agentDir = resolve(process.cwd(), '.agent');
      const repoThisDir = resolve(agentDir, 'repo=.this');
      const repoRoleDir = resolve(
        agentDir,
        `repo=${repoSlug}`,
        `role=${role.slug}`,
      );

      mkdirSync(agentDir, { recursive: true });
      mkdirSync(repoThisDir, { recursive: true });
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

      // Upsert .agent/repo=$repo/role=$role/readme.md
      if (role.readme) {
        const roleReadmePath = resolve(repoRoleDir, 'readme.md');
        const relativeRoleReadmePath = relative(process.cwd(), roleReadmePath);
        writeFileSync(roleReadmePath, role.readme, 'utf8');
        console.log(`  + ${relativeRoleReadmePath} (upserted)`);
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

      console.log(``);
      console.log(`🔗 Linked role "${role.slug}" from repo "${repoSlug}"`);
      if (briefsCount > 0) console.log(`  - ${briefsCount} brief(s) linked`);
      if (skillsCount > 0) console.log(`  - ${skillsCount} skill(s) linked`);
      console.log(``);
    });
};
