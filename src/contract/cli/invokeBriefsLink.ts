import { resolve } from 'node:path';
import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { assureFindRole } from '../../logic/invoke/assureFindRole';
import { symlinkResourceDirectories } from '../../logic/invoke/link/symlinkResourceDirectories';
import type { RoleRegistry } from '../sdk';

/**
 * .what = adds the "briefs link" subcommand to the CLI
 * .why = creates symlinks to role briefs from node_modules for easy access
 * .how = creates .agent/repo=$repo/role=$role/briefs directory and symlinks brief files
 */
export const invokeBriefsLink = ({
  command,
  registries,
}: {
  command: Command;
  registries: RoleRegistry[];
}): void => {
  command
    .command('link')
    .description('create symlinks to role briefs in .agent/ structure')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to link briefs for')
    .action((opts: { repo?: string; role?: string }) => {
      if (!opts.repo)
        BadRequestError.throw('--repo is required (e.g., --repo ehmpathy)');
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const repoSlug = opts.repo;

      // Find the role from registries
      const role = assureFindRole({ registries, slug: opts.role });

      // Check if role has briefs configured
      if (role.briefs.dirs.length === 0) {
        BadRequestError.throw(
          `Role "${role.slug}" does not have briefs configured`,
        );
      }

      console.log(``);
      console.log(
        `📎 Linking briefs for role "${role.slug}" from repo "${repoSlug}"...`,
      );

      // Create .agent/repo=$repo/role=$role/briefs directory and link briefs
      const briefsDir = resolve(
        process.cwd(),
        '.agent',
        `repo=${repoSlug}`,
        `role=${role.slug}`,
        'briefs',
      );

      const totalFiles = symlinkResourceDirectories({
        sourceDirs: role.briefs.dirs,
        targetDir: briefsDir,
        resourceName: 'briefs',
      });

      console.log(``);
      console.log(`🔗 Linked ${totalFiles} brief(s) to ${briefsDir}`);
      console.log(``);
    });
};
