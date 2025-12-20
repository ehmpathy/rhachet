import type { Command } from 'commander';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';
import { generateRhachetConfig } from '@src/domain.operations/init/generateRhachetConfig';
import { findsertFile } from '@src/infra/findsertFile';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
    .action(async () => {
      const cwd = process.cwd();
      const root = await getGitRepoRoot({ from: cwd });

      console.log(``);
      console.log(`🔭 Search for rhachet role packages...`);

      // discover role packages
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
      console.log(`✨ findsert rhachet resources...`);

      // findsert rhachet.use.ts
      const configPath = resolve(root, 'rhachet.use.ts');
      const configContent = generateRhachetConfig({ packages });
      findsertFile({ cwd, path: configPath, content: configContent });

      // fix legacy import syntax: `import { InvokeHook` -> `import type { InvokeHook`
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf8');
        if (content.includes('import { InvokeHook')) {
          const fixed = content.replace(
            /import \{ InvokeHook/g,
            'import type { InvokeHook',
          );
          writeFileSync(configPath, fixed, 'utf8');
          console.log(`  ↻ [fixed] ${relative(cwd, configPath)} (import type)`);
        }
      }

      // findsert .agent/repo=.this/role=any directories and readme
      const roleAnyDir = resolve(root, '.agent', 'repo=.this', 'role=any');
      findsertFile({ cwd, path: resolve(roleAnyDir, 'briefs') });
      findsertFile({ cwd, path: resolve(roleAnyDir, 'skills') });
      findsertFile({
        cwd,
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
