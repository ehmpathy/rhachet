import type { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';
import { genRhachetUseConfig } from '@src/domain.operations/init/genRhachetUseConfig';
import { findsertFile } from '@src/infra/findsertFile';
import { upsertFile } from '@src/infra/upsertFile';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = generates rhachet.use.ts config from discovered role packages
 * .why = reusable logic for --config path, extracted from original init action
 */
export const generateRhachetUseTs = async (
  input: {
    mode: 'findsert' | 'upsert';
  },
  context: ContextCli,
): Promise<void> => {
  console.log(``);
  console.log(`🔭 Search for rhachet role packages...`);

  // discover role packages
  const packages = await discoverRolePackages(context);

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

  // select persist function based on mode
  const persistFile = input.mode === 'upsert' ? upsertFile : findsertFile;

  console.log(``);
  console.log(`✨ ${input.mode} rhachet resources...`);

  // persist rhachet.use.ts (upsert or findsert based on mode)
  const configPath = resolve(context.gitroot, 'rhachet.use.ts');
  const configContent = genRhachetUseConfig({ packages });
  persistFile({ cwd: context.cwd, path: configPath, content: configContent });

  // fix legacy import syntax: `import { InvokeHook` -> `import type { InvokeHook`
  // (only needed for findsert mode when file may have old syntax)
  if (input.mode === 'findsert' && existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf8');
    if (content.includes('import { InvokeHook')) {
      const fixed = content.replace(
        /import \{ InvokeHook/g,
        'import type { InvokeHook',
      );
      writeFileSync(configPath, fixed, 'utf8');
      console.log(
        `  ↻ [fixed] ${relative(context.cwd, configPath)} (import type)`,
      );
    }
  }

  // persist .agent/repo=.this/role=any directories and readme
  const roleAnyDir = resolve(
    context.gitroot,
    '.agent',
    'repo=.this',
    'role=any',
  );
  persistFile({ cwd: context.cwd, path: resolve(roleAnyDir, 'briefs') });
  persistFile({ cwd: context.cwd, path: resolve(roleAnyDir, 'skills') });
  persistFile({
    cwd: context.cwd,
    path: resolve(roleAnyDir, 'readme.md'),
    content: 'this role applies to any agent that works within this repo\n',
  });

  console.log(``);
  console.log(
    `🌊 Done, rhachet config with ${packages.length} role package(s), ready for use`,
  );
  console.log(``);
  console.log(`Run 'npx rhachet list' to see available roles.`);
};
