import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import type { RoleRegistry } from '@src/domain.objects';
import { assertRegistrySkillsExecutable } from '@src/domain.operations/manifest/assertRegistrySkillsExecutable';
import {
  castIntoRoleRegistryManifest,
  serializeRoleRegistryManifest,
} from '@src/domain.operations/manifest/castIntoRoleRegistryManifest';

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * .what = adds the "repo introspect" command to the CLI
 * .why = enables generation of rhachet.repo.yml from getRoleRegistry export
 *
 * .note = this command runs inside a rhachet-roles-* package
 */
export const invokeRepoIntrospect = ({
  program,
}: {
  program: Command;
}): void => {
  const repoCommand = program
    .command('repo')
    .description('repository management commands');

  repoCommand
    .command('introspect')
    .description(
      'generate rhachet.repo.yml from package getRoleRegistry export',
    )
    .option(
      '-o, --output <path>',
      'output path (default: rhachet.repo.yml, use "-" for stdout)',
      'rhachet.repo.yml',
    )
    .action(async (options: { output: string }) => {
      const cwd = process.cwd();
      const gitRoot = await getGitRepoRoot({ from: cwd });

      // read package.json to get package name
      const packageJsonPath = resolve(gitRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const packageName: string = packageJson.name;

      // fail fast if not a rhachet-roles-* package
      if (!packageName.startsWith('rhachet-roles-'))
        throw new BadRequestError(
          `repo introspect must be run inside a rhachet-roles-* package`,
          { packageName },
        );

      // load getRoleRegistry from the package entry point directly
      console.log(``);
      console.log(`🔭 Load getRoleRegistry from ${packageName}...`);

      // resolve entry point from package.json main field (default to index.js)
      const entryPoint: string = packageJson.main ?? 'index.js';
      const entryPath = resolve(gitRoot, entryPoint);

      // use createRequire from gitRoot to load the entry point directly
      const localRequire = createRequire(resolve(gitRoot, 'package.json'));
      const packageExports: { getRoleRegistry?: () => RoleRegistry } =
        localRequire(entryPath);

      // fail fast if getRoleRegistry not exported
      if (!packageExports.getRoleRegistry)
        throw new BadRequestError(`package does not export getRoleRegistry`, {
          packageName,
        });

      const registry = packageExports.getRoleRegistry();

      // fail fast if any skills are not executable
      assertRegistrySkillsExecutable({ registry });

      // generate manifest
      console.log(``);
      console.log(`✨ Generate manifest for "${registry.slug}"...`);

      const manifest = castIntoRoleRegistryManifest({
        registry,
        packageRoot: gitRoot,
      });
      const yaml = serializeRoleRegistryManifest({ manifest });

      // output to stdout or file
      if (options.output === '-') {
        console.log(``);
        console.log(yaml);
      } else {
        const outputPath = resolve(cwd, options.output);
        writeFileSync(outputPath, yaml, 'utf8');
        console.log(`   + ${options.output}`);

        // track package.json changes to write once at end
        let packageJsonChanged = false;

        // findsert rhachet.repo.yml into package.json files array
        const filesArray: string[] = packageJson.files ?? [];
        const manifestFilename = 'rhachet.repo.yml';
        const filesArrayContainsManifest =
          filesArray.includes(manifestFilename);
        if (!filesArrayContainsManifest) {
          packageJson.files = [...filesArray, manifestFilename];
          packageJsonChanged = true;
          console.log(`   + package.json:.files += "${manifestFilename}"`);
        }

        // findsert ./package.json into exports (required for esm compatibility)
        const exportsField: Record<string, string> | undefined =
          packageJson.exports;
        if (exportsField && !exportsField['./package.json']) {
          packageJson.exports = {
            ...exportsField,
            './package.json': './package.json',
          };
          packageJsonChanged = true;
          console.log(`   + package.json:.exports += "./package.json"`);
        }

        // write package.json if changed
        if (packageJsonChanged) {
          writeFileSync(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2) + '\n',
            'utf8',
          );
        }

        console.log(``);
        console.log(
          `🌊 Done, rhachet.repo.yml generated with ${registry.roles.length} role(s)`,
        );
        console.log(``);
      }
    });
};
