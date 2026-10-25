import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import { type ContextCli, genContextCli } from '@src/domain.objects/ContextCli';
import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { assertRepoActorBrainDirWritable } from '@src/domain.operations/init/boots/assertRepoActorBrainDirWritable';
import { assertRepoBrainDirSymlinkLandsHere } from '@src/domain.operations/init/boots/assertRepoBrainDirSymlinkLandsHere';
import { setRepoActorBrainDirLayoutBeforeInits } from '@src/domain.operations/init/boots/setRepoActorBrainDirLayout';
import { syncAndReportBrainDirBoots } from '@src/domain.operations/init/boots/syncAndReportBrainDirBoots';
import { generateRhachetUseTs } from '@src/domain.operations/init/config/generateRhachetUseTs';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/hooks/syncHooksForLinkedRoles';
import { persistPrepareEntries } from '@src/domain.operations/init/prep/persistPrepareEntries';
import { setPrepareRhachetRolesDelta } from '@src/domain.operations/init/prep/setPrepareRhachetRolesDelta';
import { asRhxSkewNoticeOrNull } from '@src/domain.operations/init/provenance/asRhxSkewNoticeOrNull';
import { getRoleSlugsForFlags } from '@src/domain.operations/init/roles/getRoleSlugsForFlags';
import { setIncrementalRoles } from '@src/domain.operations/init/roles/incremental/setIncrementalRoles';
import { isRolesPartWayFaultError } from '@src/domain.operations/init/roles/link/asRolesPartWayFaultError';
import { initRolesFromPackages } from '@src/domain.operations/init/roles/link/initRolesFromPackages';
import { showInitUsageInstructions } from '@src/domain.operations/init/usage/showInitUsageInstructions';
import { initKeyrackRepoManifest } from '@src/domain.operations/keyrack/initKeyrackRepoManifest';
import { getRoleDeltaMode } from '@src/domain.operations/roles/deltas/getRoleDeltaMode';
import { getRoleDeltas } from '@src/domain.operations/roles/deltas/getRoleDeltas';
import { getRoleDeltasOfKind } from '@src/domain.operations/roles/deltas/getRoleDeltasOfKind';
import { getRoleDeltaTokens } from '@src/domain.operations/roles/deltas/getRoleDeltaTokens';
import { getOneRhxProvenance } from '@src/infra/getOneRhxProvenance';

/**
 * .what = apply an incremental role delta to the `prepare:rhachet` replay; null when the
 *   roles are absent or absolute (an absolute set is persisted by `--prep` itself)
 * .why = removals apply always, so the next install never re-links a removed role
 *   (critical: inventory.of=requirements.case=1); additions only under `--prep`, which
 *   asks to persist them
 */
const setPrepareRhachetOfIncrementalOrNull = async (
  input: { deltas: RoleDelta[] | null; prep: boolean },
  context: ContextCli,
): Promise<Awaited<ReturnType<typeof setPrepareRhachetRolesDelta>> | null> => {
  if (input.deltas === null) return null;
  const mode = getRoleDeltaMode({ deltas: input.deltas });
  if (mode !== 'incremental') return null;
  const additions = input.prep
    ? getRoleDeltasOfKind({ deltas: input.deltas, kind: 'addition' })
    : [];
  const removals = getRoleDeltasOfKind({
    deltas: input.deltas,
    kind: 'subtraction',
  });
  return await setPrepareRhachetRolesDelta({ additions, removals }, context);
};

/**
 * .what = re-render every brain dir boot, then sync hooks once the repo actor's boot rendered
 * .why = one order for both the clean path and the part-way path: a repo never drops its boot
 *   hooks before boot.md exists
 */
const syncBootsThenHooks = async (
  input: {
    repoPath: string;
    hooks: boolean | string[] | undefined;
    symlinkPrior: Parameters<
      typeof syncAndReportBrainDirBoots
    >[0]['symlinkPrior'];
  },
  context: ContextCli,
): Promise<{
  boots: Awaited<ReturnType<typeof syncAndReportBrainDirBoots>>;
  hooksHaveErrors: boolean;
}> => {
  const boots = await syncAndReportBrainDirBoots(
    {
      repoPath: input.repoPath,
      env: process.env,
      symlinkPrior: input.symlinkPrior,
    },
    context,
  );
  if (input.hooks === undefined || !boots.repoActorRendered)
    return { boots, hooksHaveErrors: false };
  const brains =
    Array.isArray(input.hooks) && input.hooks.length > 0
      ? input.hooks
      : undefined;
  const hookResult = await syncHooksForLinkedRoles({ brains }, context);
  return { boots, hooksHaveErrors: hookResult.errors.length > 0 };
};

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

        // name the rhx that runs, when the repo pins another (vision case 7); a notice, never
        // a refusal (F3)
        const rhxSkewNotice = asRhxSkewNoticeOrNull(
          getOneRhxProvenance({ repoPath: context.gitroot }),
        );
        if (rhxSkewNotice !== null) console.log(`${rhxSkewNotice}\n`);

        // flatten via the shared `--roles` tokenizer: decodes the argv sentinel
        // and accepts both the space form (`+a -b`) and comma form (`+a,-b`)
        const rolesDecoded = options.roles
          ? getRoleDeltaTokens({ raw: options.roles })
          : undefined;

        // validate: --prep requires --roles
        if (options.prep && (!rolesDecoded || rolesDecoded.length === 0)) {
          throw new ConstraintError('--prep requires --roles', {
            prep: options.prep,
            roles: rolesDecoded,
          });
        }

        // validate: --keys requires --roles
        if (options.keys && (!rolesDecoded || rolesDecoded.length === 0)) {
          throw new ConstraintError(
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

        // flag: --roles => put the repo actor's brain dir in the split layout BEFORE the role
        //   inits, so an init that writes through `<repo>/.claude` meets the layout it lives in
        //   (inventory.of=requirements.case=8). bare `rhx init` and `--hooks` run no inits
        const layoutBeforeInits =
          deltas !== null
            ? await setRepoActorBrainDirLayoutBeforeInits({
                repoPath: context.gitroot,
              })
            : null;

        // flag: --roles => refuse, before any role links, a brain dir no init may write
        //   through: one this process cannot write (vision case 2), or a <repo>/.claude that
        //   lands elsewhere (case 4, F6). each names its cause; no role is left part-way
        if (deltas !== null) {
          const repoActorBrainDir = getBrainOndiskDir({
            actorDir: getOneRepoActorOndiskDir({ repoPath: context.gitroot }),
          });
          assertRepoActorBrainDirWritable({ repoActorBrainDir });
          assertRepoBrainDirSymlinkLandsHere({
            repoPath: context.gitroot,
            repoActorBrainDir,
          });
        }

        // flag: --roles => init roles from packages (absolute or incremental).
        // absolute mode may accumulate errors; incremental fails fast (throws).
        // the iife yields a boolean so the error state stays an immutable const
        const rolesInitHasErrors = await (async (): Promise<boolean> => {
          if (!deltas) return false;

          const mode = getRoleDeltaMode({ deltas });

          // absolute: replace the whole set (legacy behavior).
          //   a part-way fault (a role's init failed after some roles linked) syncs hooks to
          //   the roles linked on disk under --hooks, then fails loud with the named sets, so
          //   no hook is left for a role that is not linked (vision case 3)
          if (mode === 'absolute') {
            const result = await initRolesFromPackages(
              { specifiers: getRoleDeltasOfKind({ deltas, kind: 'absolute' }) },
              context,
            ).catch(async (error: unknown) => {
              if (
                isRolesPartWayFaultError(error) &&
                options.hooks !== undefined
              )
                await syncBootsThenHooks(
                  {
                    repoPath: context.gitroot,
                    hooks: options.hooks,
                    symlinkPrior: layoutBeforeInits?.symlink ?? null,
                  },
                  context,
                );
              throw error;
            });
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

        // an incremental delta reaches the `prepare:rhachet` replay, so the next install
        // never re-links a removed role (critical: inventory.of=requirements.case=1)
        const prepareDelta = await setPrepareRhachetOfIncrementalOrNull(
          { deltas, prep: options.prep === true },
          context,
        );

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

        // flag: --roles or --hooks => re-render every brain dir boot, after the links land.
        // it precedes the hook sync, so a repo never drops its boot hooks before boot.md exists
        // flag: --hooks => then apply hooks, only once the default boot.md rendered
        const { boots, hooksHaveErrors } =
          deltas !== null || options.hooks !== undefined
            ? await syncBootsThenHooks(
                {
                  repoPath: context.gitroot,
                  hooks: options.hooks,
                  symlinkPrior: layoutBeforeInits?.symlink ?? null,
                },
                context,
              )
            : {
                boots: { exitCode: 0 as const, repoActorRendered: true },
                hooksHaveErrors: false,
              };

        // flag: --prep => persist to package.json; plain slugs only.
        // an incremental delta already applied itself to an extant entry above; a full
        // write here would replace the extant roles with the additions alone
        const isPrepareDeltaApplied =
          prepareDelta !== null && prepareDelta.effect !== 'ABSENT';
        if (
          options.prep &&
          roleSlugsForFlags.length > 0 &&
          !isPrepareDeltaApplied
        ) {
          await persistPrepareEntries(
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

        // exit by the brain dir sync's own rule: 2 for a human fix, 1 for a malfunction
        if (boots.exitCode !== 0) process.exit(boots.exitCode);

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
