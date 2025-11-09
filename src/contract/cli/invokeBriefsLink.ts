import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { readdirSync, mkdirSync, symlinkSync, existsSync } from 'node:fs';
import { resolve, basename, relative } from 'node:path';

import { assureFindRole } from '../../logic/invoke/assureFindRole';
import { RoleRegistry } from '../sdk';

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

      // Create .agent/repo=$repo/role=$role/briefs directory
      const briefsDir = resolve(
        process.cwd(),
        '.agent',
        `repo=${repoSlug}`,
        `role=${role.slug}`,
        'briefs',
      );
      mkdirSync(briefsDir, { recursive: true });

      console.log(``);
      console.log(
        `📎 Linking briefs for role "${role.slug}" from repo "${repoSlug}"...`,
      );

      let totalFiles = 0;

      // Process each brief directory
      for (const briefDir of role.briefs.dirs) {
        const sourceDir = resolve(process.cwd(), briefDir.uri);

        // Check if source directory exists
        if (!existsSync(sourceDir)) {
          BadRequestError.throw(
            `Source directory not found: ${sourceDir}\nMake sure role "${role.slug}" briefs directory is accessible`,
          );
        }

        // Read all files in the source directory
        const files = readdirSync(sourceDir);

        if (files.length === 0) {
          console.log(`  ⚠️  No briefs found in ${briefDir.uri}`);
          continue;
        }

        // Create symlinks for each file
        for (const file of files) {
          const sourcePath = resolve(sourceDir, file);
          const targetPath = resolve(briefsDir, basename(file));

          // Remove existing symlink if it exists
          if (existsSync(targetPath)) {
            console.log(`  ↻ ${file} (updating)`);
          } else {
            console.log(`  + ${file}`);
          }

          // Create relative symlink from target directory to source file
          const relativeSource = relative(briefsDir, sourcePath);

          try {
            symlinkSync(relativeSource, targetPath);
            totalFiles++;
          } catch (error: any) {
            if (error.code === 'EEXIST') {
              // If file exists and is not a symlink, warn user
              console.log(`  ⚠️  ${file} already exists (skipping)`);
            } else {
              throw error;
            }
          }
        }
      }

      console.log(``);
      console.log(`🔗 Linked ${totalFiles} brief(s) to ${briefsDir}`);
      console.log(``);
    });
};
