import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';

/**
 * .what = removes hooks from roles that are no longer linked
 * .why = when a role is unlinked, its hooks should be cleaned up on next init
 *
 * .how = identifies hooks with rhachet-managed authors (repo=.../role=...),
 *        compares against authorsDesired set, removes orphans
 */
export const pruneOrphanedRoleHooksFromOneBrain = async (input: {
  adapter: BrainHooksAdapter;
  authorsDesired: Set<string>;
}): Promise<{ removed: BrainHook[] }> => {
  const { adapter, authorsDesired } = input;

  // get all hooks from brain
  const allHooks = await adapter.dao.get.all();

  // identify rhachet-managed hooks by author pattern
  const rhachetAuthorPattern = /^repo=.+\/role=.+$/;
  const rhachetHooks = allHooks.filter((h) =>
    rhachetAuthorPattern.test(h.author),
  );

  // find orphaned hooks (author not in linked roles)
  const orphanedHooks = rhachetHooks.filter(
    (hook) => !authorsDesired.has(hook.author),
  );

  // remove orphaned hooks
  const removed: BrainHook[] = [];
  for (const hook of orphanedHooks) {
    await adapter.dao.del({
      by: {
        unique: {
          author: hook.author,
          event: hook.event,
          command: hook.command,
        },
      },
    });
    removed.push(hook);
  }

  return { removed };
};
