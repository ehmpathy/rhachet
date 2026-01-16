import type { Command } from 'commander';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';
import { genRhachetUseConfig } from '@src/domain.operations/init/genRhachetUseConfig';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/syncHooksForLinkedRoles';
import { generateRhachetUseTs } from '@src/domain.operations/init/generateRhachetUseTs';
import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';
import { showInitUsageInstructions } from '@src/domain.operations/init/showInitUsageInstructions';

/**
 * .what = adds the "init" command to the CLI
 * .why = enables initialization of roles from packages or config generation
 */
export const invokeInit = ({ program }: { program: Command }): void => {
  program
    .command('init')
    .description('initialize roles from packages or generate rhachet.use.ts')
    .option('--roles <roles...>', 'role specifiers to initialize')
    .option(
      '--hooks [brains...]',
      'apply brain hooks (auto-detect brains if no args)',
    )
    .option('--config', 'generate rhachet.use.ts config (legacy behavior)')
    .option(
      '--mode <mode>',
      'findsert (default) preserves prior, upsert overwrites',
      'findsert',
    )
    .action(
      async (options: {
        roles?: string[];
        hooks?: boolean | string[];
        config?: boolean;
        mode: 'findsert' | 'upsert';
      }) => {
        const cwd = process.cwd();

        // route: --roles provided => init roles from packages
        if (options.roles && options.roles.length > 0) {
          const context = new ContextCli({ cwd });
          await initRolesFromPackages({ specifiers: options.roles }, context);

          // if --hooks also specified, apply hooks after init
          if (options.hooks !== undefined) {
            const brains =
              Array.isArray(options.hooks) && options.hooks.length > 0
                ? options.hooks
                : undefined;
            await syncHooksForLinkedRoles({ from: cwd, brains });
          }
          return;
        }

        // route: --hooks alone => reapply hooks for already-linked roles
        if (options.hooks !== undefined) {
          const brains =
            Array.isArray(options.hooks) && options.hooks.length > 0
              ? options.hooks
              : undefined;
          await syncHooksForLinkedRoles({ from: cwd, brains });
          return;
        }

        // route: --config provided => generate rhachet.use.ts
        if (options.config) {
          const root = await getGitRepoRoot({ from: cwd });
          await generateRhachetUseTs({ cwd, root, mode: options.mode });
          return;
        }

        // route: no flags => show usage instructions
        await showInitUsageInstructions({ from: cwd });
      },
    );
};
