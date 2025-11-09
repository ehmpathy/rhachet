import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import {
  readdirSync,
  mkdirSync,
  symlinkSync,
  existsSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  rmSync,
} from 'node:fs';
import { resolve, basename, relative } from 'node:path';

import { assureFindRole } from '../../logic/invoke/assureFindRole';
import {
  getAgentRootReadmeTemplate,
  getAgentRepoThisReadmeTemplate,
} from '../../logic/invoke/getAgentReadmeTemplates';
import { RoleRegistry } from '../sdk';

/**
 * .what = finds or inserts a file with template content
 * .why = ensures standard readme files exist without overwriting custom changes
 * .how = only writes if file doesn't exist or content matches template exactly
 */
const findsertFile = (options: { path: string; template: string }): void => {
  const { path, template } = options;

  if (!existsSync(path)) {
    console.log(`  + ${basename(path)} (created)`);
    writeFileSync(path, template, 'utf8');
    return;
  }

  // File exists - check if it matches template
  const existingContent = readFileSync(path, 'utf8');
  if (existingContent === template) {
    console.log(`  ✓ ${basename(path)} (unchanged)`);
  } else {
    console.log(`  ↻ ${basename(path)} (preserved with custom changes)`);
  }
};

/**
 * .what = creates symlinks for all files in a source directory to a target directory
 * .why = enables role resources to be linked from node_modules or other sources
 */
const symlinkDirectory = (options: {
  sourceDir: string;
  targetDir: string;
  label: string;
}): number => {
  const { sourceDir, targetDir, label } = options;

  if (!existsSync(sourceDir)) {
    return 0; // No source directory, skip silently
  }

  const files = readdirSync(sourceDir);

  if (files.length === 0) {
    return 0;
  }

  mkdirSync(targetDir, { recursive: true });

  for (const file of files) {
    const sourcePath = resolve(sourceDir, file);
    const targetPath = resolve(targetDir, basename(file));

    // Remove existing symlink/file if it exists
    if (existsSync(targetPath)) {
      try {
        unlinkSync(targetPath);
        console.log(`  ↻ ${label}/${file} (updating)`);
      } catch {
        rmSync(targetPath, { recursive: true, force: true });
        console.log(`  ↻ ${label}/${file} (updating)`);
      }
    } else {
      console.log(`  + ${label}/${file}`);
    }

    // Create relative symlink from target directory to source file
    const relativeSource = relative(targetDir, sourcePath);

    try {
      symlinkSync(relativeSource, targetPath);
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        console.log(`  ⚠️  ${label}/${file} already exists (skipping)`);
      } else {
        throw error;
      }
    }
  }

  return files.length;
};

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
        writeFileSync(roleReadmePath, role.readme, 'utf8');
        console.log(`  + role=${role.slug}/readme.md (upserted)`);
      }

      // Link briefs if configured
      let briefsCount = 0;
      if (role.briefs.dirs.length > 0) {
        for (const briefDir of role.briefs.dirs) {
          const sourceDir = resolve(process.cwd(), briefDir.uri);
          const targetDir = resolve(repoRoleDir, 'briefs');
          briefsCount += symlinkDirectory({
            sourceDir,
            targetDir,
            label: 'briefs',
          });
        }
      }

      // Link skills if configured
      let skillsCount = 0;
      if (role.skills.dirs.length > 0) {
        for (const skillDir of role.skills.dirs) {
          const sourceDir = resolve(process.cwd(), skillDir.uri);
          const targetDir = resolve(repoRoleDir, 'skills');
          skillsCount += symlinkDirectory({
            sourceDir,
            targetDir,
            label: 'skills',
          });
        }
      }

      console.log(``);
      console.log(`🔗 Linked role "${role.slug}" from repo "${repoSlug}"`);
      if (briefsCount > 0) console.log(`  - ${briefsCount} brief(s) linked`);
      if (skillsCount > 0) console.log(`  - ${skillsCount} skill(s) linked`);
      console.log(``);
    });
};
