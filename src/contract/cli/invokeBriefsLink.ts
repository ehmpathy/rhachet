import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { readdirSync, mkdirSync, symlinkSync, existsSync } from 'node:fs';
import { resolve, basename, relative } from 'node:path';

import { assureFindRole } from '../../logic/invoke/assureFindRole';
import { RoleRegistry } from '../sdk';

/**
 * .what = adds the "briefs link" subcommand to the CLI
 * .why = creates symlinks to role briefs from node_modules for easy access
 * .how = creates .briefs/<role> directory and symlinks brief files from the role's package
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
    .description('create symlinks to role briefs in .briefs/<role>/')
    .option('--role <slug>', 'the role to link briefs for')
    .action((opts: { role?: string }) => {
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      // Find the role from registries
      const role = assureFindRole({ registries, slug: opts.role });

      // Check if role has briefs configured
      if (!role.briefs || !role.briefs.dir) {
        BadRequestError.throw(
          `Role "${role.slug}" does not have briefs configured`,
        );
      }

      // Create .briefs/<role> directory
      const briefsDir = resolve(process.cwd(), '.briefs', role.slug);
      mkdirSync(briefsDir, { recursive: true });

      // Path to the role's briefs directory
      const sourceDir = resolve(process.cwd(), role.briefs.dir);

      // Check if source directory exists
      if (!existsSync(sourceDir)) {
        BadRequestError.throw(
          `Source directory not found: ${sourceDir}\nMake sure role "${role.slug}" briefs directory is accessible`,
        );
      }

      // Read all files in the source directory
      const files = readdirSync(sourceDir);

      if (files.length === 0) {
        console.log(``);
        console.log(`⚠️  No briefs found for role "${role.slug}"`);
        console.log(``);
        return;
      }

      // Create symlinks for each file
      console.log(``);
      console.log(`📎 Linking briefs for role "${role.slug}"...`);

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
        } catch (error: any) {
          if (error.code === 'EEXIST') {
            // If file exists and is not a symlink, warn user
            console.log(`  ⚠️  ${file} already exists (skipping)`);
          } else {
            throw error;
          }
        }
      }

      console.log(``);
      console.log(`✓ Linked ${files.length} brief(s) to ${briefsDir}`);
      console.log(``);
    });
};
