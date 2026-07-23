import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { genContextCli } from '@src/domain.objects/ContextCli';
import { generateRhachetUseTs } from '@src/domain.operations/init/config/generateRhachetUseTs';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/hooks/syncHooksForLinkedRoles';
import { persistPrepareEntries } from '@src/domain.operations/init/prep/persistPrepareEntries';
import { getRoleSlugsForFlags } from '@src/domain.operations/init/roles/getRoleSlugsForFlags';
import { setIncrementalRoles } from '@src/domain.operations/init/roles/incremental/setIncrementalRoles';
import { initRolesFromPackages } from '@src/domain.operations/init/roles/link/initRolesFromPackages';
import { showInitUsageInstructions } from '@src/domain.operations/init/usage/showInitUsageInstructions';
import { initKeyrackRepoManifest } from '@src/domain.operations/keyrack/initKeyrackRepoManifest';
import { getRoleDeltaMode } from '@src/domain.operations/roles/deltas/getRoleDeltaMode';
import { getRoleDeltas } from '@src/domain.operations/roles/deltas/getRoleDeltas';
import { getRoleDeltasOfKind } from '@src/domain.operations/roles/deltas/getRoleDeltasOfKind';
import { getRoleDeltaTokens } from '@src/domain.operations/roles/deltas/getRoleDeltaTokens';

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

        // flatten via the shared `--roles` tokenizer: decodes the argv sentinel
        // and accepts both the space form (`+a -b`) and comma form (`+a,-b`)
        const rolesDecoded = options.roles
          ? getRoleDeltaTokens({ raw: options.roles })
          : undefined;

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

        // parse the deltas once (absolute vs incremental) when roles are present.
        // downstream flags (--keys, --prep) act on plain role slugs, so derive
        // them here — never the raw sigiled tokens (`+architect` / `-reviewer`)
        const deltas =
          rolesDecoded && rolesDecoded.length > 0
            ? getRoleDeltas({ tokens: rolesDecoded })
            : null;
        const roleSlugsForFlags = getRoleSlugsForFlags({ deltas });

        // flag: --roles => init roles from packages (absolute or incremental).
        // absolute mode may accumulate errors; incremental fails fast (throws).
        // the iife yields a boolean so the error state stays an immutable const
        const rolesInitHasErrors = await (async (): Promise<boolean> => {
          if (!deltas) return false;

          const mode = getRoleDeltaMode({ deltas });

          // absolute: replace the whole set (legacy behavior)
          if (mode === 'absolute') {
            const result = await initRolesFromPackages(
              { specifiers: getRoleDeltasOfKind({ deltas, kind: 'absolute' }) },
              context,
            );
            return result.errors.length > 0;
          }

          // incremental: adjust the set relative to the current set
          // (fail-fast: setIncrementalRoles throws on error, caught by invoke.ts)
          if (mode === 'incremental') {
            await setIncrementalRoles(
              {
                additions: getRoleDeltasOfKind({ deltas, kind: 'addition' }),
                subtractions: getRoleDeltasOfKind({
                  deltas,
                  kind: 'subtraction',
                }),
              },
              context,
            );
            return false;
          }

          return false;
        })();

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

        // flag: --hooks => apply hooks; the iife yields a boolean so the error
        // state stays an immutable const
        const hooksHaveErrors = await (async (): Promise<boolean> => {
          if (options.hooks === undefined) return false;
          const brains =
            Array.isArray(options.hooks) && options.hooks.length > 0
              ? options.hooks
              : undefined;
          const hookResult = await syncHooksForLinkedRoles({ brains }, context);
          return hookResult.errors.length > 0;
        })();

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

        // exit with failure if any init step accumulated errors
        const hasErrors = rolesInitHasErrors || hooksHaveErrors;
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
