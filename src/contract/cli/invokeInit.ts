import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { genContextCli } from '@src/domain.objects/ContextCli';
import { generateRhachetUseTs } from '@src/domain.operations/init/generateRhachetUseTs';
import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';
import { persistPrepareEntries } from '@src/domain.operations/init/persistPrepareEntries';
import { showInitUsageInstructions } from '@src/domain.operations/init/showInitUsageInstructions';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/syncHooksForLinkedRoles';
import { initKeyrackRepoManifest } from '@src/domain.operations/keyrack/initKeyrackRepoManifest';

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
    .option('--prep', 'persist init command to package.json prepare entries')
    .option(
      '--mode <mode>',
      'findsert (default) preserves prior, upsert overwrites',
      'findsert',
    )
    .option('--keys', 'initialize keyrack manifest (requires --roles)')
    .action(
      async (options: {
        roles?: string[];
        hooks?: boolean | string[];
        config?: boolean;
        prep?: boolean;
        mode: 'findsert' | 'upsert';
        keys?: boolean;
      }) => {
        // build context for operations
        const context = await genContextCli({ cwd: process.cwd() });

        // validate: --prep requires --roles
        if (options.prep && (!options.roles || options.roles.length === 0)) {
          throw new BadRequestError('--prep requires --roles', {
            prep: options.prep,
            roles: options.roles,
          });
        }

        // validate: --keys requires --roles
        if (options.keys && (!options.roles || options.roles.length === 0)) {
          throw new BadRequestError(
            '--keys requires --roles to specify which role keyracks to extend',
            {
              example: 'npx rhachet init --keys --roles mechanic dispatcher',
            },
          );
        }

        // track errors for exit code
        let hasErrors = false;

        // flag: --roles => init roles from packages
        if (options.roles && options.roles.length > 0) {
          const result = await initRolesFromPackages(
            { specifiers: options.roles },
            context,
          );
          if (result.errors.length) hasErrors = true;
        }

        // flag: --keys => init keyrack manifest (after roles)
        if (options.keys && options.roles && options.roles.length > 0) {
          const result = await initKeyrackRepoManifest(
            { roles: options.roles },
            context,
          );

          // output tree (use relative path for display)
          const manifestRelative = result.manifestPath.startsWith(
            context.gitroot,
          )
            ? result.manifestPath.slice(context.gitroot.length + 1)
            : result.manifestPath;

          console.log('🔑 keyrack init');
          console.log(`   ├─ org: ${result.org}`);
          if (result.extends.length > 0) {
            console.log('   ├─ extends:');
            result.extends.forEach((path, i) => {
              const prefix =
                i === result.extends.length - 1 ? '   │  └─' : '   │  ├─';
              console.log(`${prefix} ${path}`);
            });
          }
          const effectMessage =
            result.effect === 'created'
              ? `created ${manifestRelative}`
              : result.effect === 'updated'
                ? `updated ${manifestRelative}`
                : `found ${manifestRelative} (no changes)`;
          console.log(`   └─ ${effectMessage}`);
          console.log('');
        }

        // flag: --hooks => apply hooks
        if (options.hooks !== undefined) {
          const brains =
            Array.isArray(options.hooks) && options.hooks.length > 0
              ? options.hooks
              : undefined;
          const hookResult = await syncHooksForLinkedRoles({ brains }, context);
          if (hookResult.errors.length) hasErrors = true;
        }

        // flag: --prep => persist to package.json
        if (options.prep && options.roles) {
          persistPrepareEntries(
            {
              hooks: options.hooks !== undefined,
              roles: options.roles,
            },
            context,
          );
        }

        // flag: --config => generate rhachet.use.ts
        if (options.config) {
          await generateRhachetUseTs({ mode: options.mode }, context);
        }

        // exit with failure if any errors occurred
        if (hasErrors) process.exit(1);

        // no flags => show usage instructions
        const hasAnyFlag =
          options.roles ||
          options.keys ||
          options.hooks !== undefined ||
          options.prep ||
          options.config;
        if (!hasAnyFlag) {
          await showInitUsageInstructions(context);
        }
      },
    );
};
