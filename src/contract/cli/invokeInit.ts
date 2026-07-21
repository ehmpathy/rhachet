import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { genContextCli } from '@src/domain.objects/ContextCli';
import { generateRhachetUseTs } from '@src/domain.operations/init/config/generateRhachetUseTs';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/hooks/syncHooksForLinkedRoles';
import { persistPrepareEntries } from '@src/domain.operations/init/prep/persistPrepareEntries';
import { setIncrementalRoles } from '@src/domain.operations/init/roles/incremental/setIncrementalRoles';
import { initRolesFromPackages } from '@src/domain.operations/init/roles/link/initRolesFromPackages';
import { getClassifiedRoleTokens } from '@src/domain.operations/init/roles/tokens/getClassifiedRoleTokens';
import { getDecodedRoleToken } from '@src/domain.operations/init/roles/tokens/getDecodedRoleToken';
import { getRoleSlugsForFlags } from '@src/domain.operations/init/roles/tokens/getRoleSlugsForFlags';
import { showInitUsageInstructions } from '@src/domain.operations/init/usage/showInitUsageInstructions';
import { initKeyrackRepoManifest } from '@src/domain.operations/keyrack/initKeyrackRepoManifest';

/**
 * .what = adds the "init" command to the CLI
 * .why = enables initialization of roles from packages or config generation
 */
export const invokeInit = ({ program }: { program: Command }): void => {
  program
    .command('init')
    .description('initialize roles from packages or generate rhachet.use.ts')
    .option(
      '--roles <roles...>',
      'role specifiers: bare names replace the set (mechanic behaver), or +role to add / -role to remove incrementally',
    )
    .option(
      '--hooks [brains...]',
      'apply brain hooks (auto-detect brains if no args)',
    )
    .option('--config', 'generate rhachet.use.ts config (legacy behavior)')
    .option('--prep', 'persist init command to package.json prepare entries')
    .option(
      '--mode <mode>',
      'findsert preserves prior, upsert overwrites',
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

        // decode sentinel-encoded `-role` tokens back to their natural form
        const rolesDecoded = options.roles?.map((token) =>
          getDecodedRoleToken({ token }),
        );

        // validate: --prep requires --roles
        if (options.prep && (!rolesDecoded || rolesDecoded.length === 0)) {
          throw new BadRequestError('--prep requires --roles', {
            prep: options.prep,
            roles: rolesDecoded,
          });
        }

        // validate: --keys requires --roles
        if (options.keys && (!rolesDecoded || rolesDecoded.length === 0)) {
          throw new BadRequestError(
            '--keys requires --roles to specify which role keyracks to extend',
            {
              example: 'npx rhachet init --keys --roles mechanic dispatcher',
            },
          );
        }

        // track errors for exit code
        let hasErrors = false;

        // classify tokens once (absolute vs incremental) when roles are present.
        // downstream flags (--keys, --prep) act on plain role slugs, so derive
        // them here — never the raw sigiled tokens (`+architect` / `-reviewer`)
        const classified =
          rolesDecoded && rolesDecoded.length > 0
            ? getClassifiedRoleTokens({ tokens: rolesDecoded })
            : null;
        const roleSlugsForFlags = getRoleSlugsForFlags({ classified });

        // flag: --roles => init roles from packages (absolute or incremental)
        if (classified) {
          // absolute: replace the whole set (legacy behavior)
          if (classified.mode === 'absolute') {
            const result = await initRolesFromPackages(
              { specifiers: classified.absolutes },
              context,
            );
            if (result.errors.length) hasErrors = true;
          }

          // incremental: adjust the set relative to the current set
          // (fail-fast: setIncrementalRoles throws on error, caught by invoke.ts)
          if (classified.mode === 'incremental') {
            await setIncrementalRoles(
              {
                additions: classified.additions,
                subtractions: classified.subtractions,
              },
              context,
            );
          }
        }

        // flag: --keys => init keyrack manifest (after roles); plain slugs only
        if (options.keys && roleSlugsForFlags.length > 0) {
          const result = await initKeyrackRepoManifest(
            { roles: roleSlugsForFlags },
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

        // flag: --prep => persist to package.json; plain slugs only
        if (options.prep && roleSlugsForFlags.length > 0) {
          persistPrepareEntries(
            {
              hooks: options.hooks !== undefined,
              roles: roleSlugsForFlags,
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
          rolesDecoded ||
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
