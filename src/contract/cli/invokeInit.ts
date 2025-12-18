import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';
import { generateRhachetConfig } from '@src/domain.operations/init/generateRhachetConfig';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = adds the "init" command to the CLI
 * .why = enables auto-generation of rhachet.use.ts config from discovered role packages
 * .how = discovers rhachet-roles-* packages and generates config file
 */
export const invokeInit = ({ program }: { program: Command }): void => {
  program
    .command('init')
    .description(
      'initialize rhachet.use.ts config from discovered role packages',
    )
    .option('--force', 'overwrite existing rhachet.use.ts')
    .action(async (opts: { force?: boolean }) => {
      const cwd = process.cwd();
      const root = await getGitRepoRoot({ from: cwd });
      const configPath = resolve(root, 'rhachet.use.ts');
      const relativeConfigPath = relative(cwd, configPath);

      // Check if config already exists
      if (existsSync(configPath) && !opts.force) {
        BadRequestError.throw(
          `rhachet.use.ts already exists. Use --force to overwrite.`,
        );
      }

      console.log(``);
      console.log(`🔭 Search for rhachet role packages...`);

      // Discover role packages
      const packages = await discoverRolePackages({ from: cwd });

      if (packages.length === 0) {
        console.log(`  - [none found]`);
        console.log(``);
        console.log(
          `⚠️  No rhachet-roles-* packages found in package.json dependencies.`,
        );
        console.log(
          `   Install a role package first, e.g.: npm install rhachet-roles-ehmpathy`,
        );
        console.log(``);
        return;
      }

      for (const pkg of packages) {
        console.log(`  - [found] ${pkg}`);
      }

      console.log(``);
      console.log(`✨ Create rhachet.use.ts...`);

      // Generate and write config
      const content = generateRhachetConfig({ packages });
      writeFileSync(configPath, content, 'utf8');
      console.log(`  + [created] ${relativeConfigPath}`);

      // Create .agent/repo=.this/role=any directories and readme (findsert: only if not found)
      const roleAnyDir = resolve(root, '.agent', 'repo=.this', 'role=any');
      const findsert = (input: { path: string; content?: string }): void => {
        if (existsSync(input.path)) {
          console.log(`  ○ [found] ${relative(cwd, input.path)}`);
          return;
        }
        if (input.content !== undefined)
          writeFileSync(input.path, input.content, 'utf8');
        else mkdirSync(input.path, { recursive: true });
        console.log(`  + [created] ${relative(cwd, input.path)}`);
      };

      findsert({ path: resolve(roleAnyDir, 'briefs') });
      findsert({ path: resolve(roleAnyDir, 'skills') });
      findsert({
        path: resolve(roleAnyDir, 'readme.md'),
        content: 'this role applies to any agent that works within this repo\n',
      });

      console.log(``);
      console.log(
        `🌊 Done, rhachet config with ${packages.length} role package(s), ready for use`,
      );
      console.log(``);
      console.log(`Run 'npx rhachet list' to see available roles.`);
    });
};
