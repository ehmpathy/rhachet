import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/asBrainDirSyncReportLines';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/hooks/syncHooksForLinkedRoles';

import { syncAndReportBrainDirBoots } from './syncAndReportBrainDirBoots';

/**
 * .what = the brains a `--hooks` flag names; undefined when it names none, so every brain is
 *   detected
 * .why = `--hooks` alone arrives as `true`, and `--hooks claude` as `['claude']`
 */
const asHookBrainsNamedOrUndefined = (input: {
  hooks: boolean | string[];
}): string[] | undefined =>
  Array.isArray(input.hooks) && input.hooks.length > 0
    ? input.hooks
    : undefined;

/**
 * .what = re-render every brain dir boot, then sync hooks once the repo actor's boot rendered
 * .why = one order for both the clean path and the part-way path of `rhx init`: a repo never
 *   drops its boot hooks before boot.md exists (F8)
 * .note = `hooks` undefined means no `--hooks` flag: the boots render, and no hook syncs
 */
export const syncBootsThenHooks = async (
  input: {
    repoPath: string;
    hooks: boolean | string[] | undefined;
    symlinkPrior: BrainDirSyncSymlink | null;
  },
  context: ContextCli,
): Promise<{
  boots: Awaited<ReturnType<typeof syncAndReportBrainDirBoots>>;
  hooksHaveErrors: boolean;
}> => {
  // render the boots first, so the hooks that read boot.md find it
  const boots = await syncAndReportBrainDirBoots(
    {
      repoPath: input.repoPath,
      env: process.env,
      symlinkPrior: input.symlinkPrior,
    },
    context,
  );

  // sync the hooks only under --hooks, and only once the repo actor's boot rendered
  if (input.hooks === undefined || !boots.repoActorRendered)
    return { boots, hooksHaveErrors: false };
  const hookResult = await syncHooksForLinkedRoles(
    { brains: asHookBrainsNamedOrUndefined({ hooks: input.hooks }) },
    context,
  );
  return { boots, hooksHaveErrors: hookResult.errors.length > 0 };
};
