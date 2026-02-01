import type { Command } from 'commander';

import { genContextCli } from '@src/domain.objects/ContextCli';
import { generateRhachetUseTs } from '@src/domain.operations/init/generateRhachetUseTs';
import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';
import { showInitUsageInstructions } from '@src/domain.operations/init/showInitUsageInstructions';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/syncHooksForLinkedRoles';

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
        // build context for operations
        const context = await genContextCli({ cwd: process.cwd() });

        // route: --roles provided => init roles from packages
        if (options.roles && options.roles.length > 0) {
          const result = await initRolesFromPackages(
            { specifiers: options.roles },
            context,
          );

          // if --hooks also specified, apply hooks after init
          let hookErrors: Array<{ source: string; error: Error }> = [];
          if (options.hooks !== undefined) {
            const brains =
              Array.isArray(options.hooks) && options.hooks.length > 0
                ? options.hooks
                : undefined;
            const hookResult = await syncHooksForLinkedRoles(
              { brains },
              context,
            );
            hookErrors = hookResult.errors;
          }

          // exit with failure if any errors occurred
          if (result.errors.length || hookErrors.length) process.exit(1);
          return;
        }

        // route: --hooks alone => reapply hooks for already-linked roles
        if (options.hooks !== undefined) {
          const brains =
            Array.isArray(options.hooks) && options.hooks.length > 0
              ? options.hooks
              : undefined;
          const hookResult = await syncHooksForLinkedRoles({ brains }, context);
          if (hookResult.errors.length) process.exit(1);
          return;
        }

        // route: --config provided => generate rhachet.use.ts
        if (options.config) {
          await generateRhachetUseTs({ mode: options.mode }, context);
          return;
        }

        // route: no flags => show usage instructions
        await showInitUsageInstructions(context);
      },
    );
};
