import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import type { RoleRegistry } from '@src/domain.objects';
import { getAllArtifactsForRole } from '@src/domain.operations/compile/getAllArtifactsForRole';

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

/**
 * .what = adds the "repo compile" command to the CLI
 * .why = enables rsync-like artifact collection for rhachet-roles-* packages
 *
 * .note = this command runs inside a rhachet-roles-* package
 * .note = replaces manual rsync commands with systematic artifact discovery
 */
export const invokeRepoCompile = ({ program }: { program: Command }): void => {
  // get or create repo command
  const repoCommand =
    program.commands.find((c) => c.name() === 'repo') ??
    program.command('repo').description('repository management commands');

  repoCommand
    .command('compile')
    .description('compile role artifacts from src to dist')
    .requiredOption('--from <path>', 'source directory (e.g., src)')
    .requiredOption('--into <path>', 'destination directory (e.g., dist)')
    .option(
      '--include <patterns...>',
      'include patterns (rescues from default exclusions)',
    )
    .option('--exclude <patterns...>', 'exclude patterns (always excludes)')
    .action(
      async (options: {
        from: string;
        into: string;
        include?: string[];
        exclude?: string[];
      }) => {
        const cwd = process.cwd();
        const gitRoot = await getGitRepoRoot({ from: cwd });

        // validate paths within repo
        const fromDir = resolve(cwd, options.from);
        const intoDir = resolve(cwd, options.into);

        if (!fromDir.startsWith(gitRoot))
          throw new ConstraintError(
            '--from must be within the git repository',
            {
              from: options.from,
              gitRoot,
            },
          );

        if (!intoDir.startsWith(gitRoot))
          throw new ConstraintError(
            '--into must be within the git repository',
            {
              into: options.into,
              gitRoot,
            },
          );

        if (!existsSync(fromDir))
          throw new ConstraintError('--from directory not found', {
            from: options.from,
          });

        // read package.json to get package name
        const packageJsonPath = resolve(gitRoot, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const packageName: string = packageJson.name;

        // fail fast if not a rhachet-roles-* package
        if (!packageName.startsWith('rhachet-roles-'))
          throw new ConstraintError(
            `repo compile must be run inside a rhachet-roles-* package`,
            { packageName },
          );

        // load getRoleRegistry from the package entry point
        console.log(``);
        console.log(`🔭 Load getRoleRegistry from ${packageName}...`);

        const entryPoint: string = packageJson.main ?? 'index.js';
        const entryPath = resolve(gitRoot, entryPoint);

        const localRequire = createRequire(resolve(gitRoot, 'package.json'));
        const packageExports: { getRoleRegistry?: () => RoleRegistry } =
          localRequire(entryPath);

        if (!packageExports.getRoleRegistry)
          throw new ConstraintError(`package does not export getRoleRegistry`, {
            packageName,
          });

        const registry = packageExports.getRoleRegistry();

        // collect and copy artifacts for each role
        console.log(``);
        console.log(
          `📦 Compile artifacts for ${registry.roles.length} role(s)...`,
        );

        let totalFiles = 0;

        for (let roleIdx = 0; roleIdx < registry.roles.length; roleIdx++) {
          const role = registry.roles[roleIdx]!;
          const isLastRole = roleIdx === registry.roles.length - 1;
          const artifacts = await getAllArtifactsForRole({
            role,
            fromDir,
            include: options.include,
            exclude: options.exclude,
          });

          const rolePrefix = isLastRole ? '└─' : '├─';
          console.log(
            `   ${rolePrefix} ${role.slug}: ${artifacts.length} file(s)`,
          );

          // show matched filetree to aid debug
          const continuation = isLastRole ? '   ' : '│  ';
          for (let i = 0; i < artifacts.length; i++) {
            const isLastFile = i === artifacts.length - 1;
            const filePrefix = isLastFile ? '└─' : '├─';
            console.log(`   ${continuation} ${filePrefix} ${artifacts[i]}`);
          }

          // copy each artifact
          for (const artifact of artifacts) {
            const srcPath = join(fromDir, artifact);
            const destPath = join(intoDir, artifact);

            // create parent dir if needed
            const destDir = dirname(destPath);
            if (!existsSync(destDir)) {
              mkdirSync(destDir, { recursive: true });
            }

            // copy file
            copyFileSync(srcPath, destPath);
          }

          totalFiles += artifacts.length;
        }

        console.log(``);
        console.log(
          `🌊 Done, compiled ${totalFiles} file(s) to ${options.into}`,
        );
        console.log(``);
      },
    );
};
