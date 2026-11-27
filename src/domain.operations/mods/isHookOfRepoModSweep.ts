import { REPO_THIS_BUDGET_HOOK_ARGS } from '@src/domain.operations/brains/getAllRepoThisRolesWithHooks';

/**
 * .what = whether a hook is the framework-owned stop sweep, and the mods dir arms it
 * .why = an actor narrow keeps a hook by its author's role, and the sweep's author is the `.this`
 *        carrier role, which a clone may not hold. a mod fault is the repo's, so where a mod arms
 *        the sweep, every actor keeps it, and every seat is told of the fault at its stop
 *
 * .note = matched by the sweep's args, never its full command, so a bin prefix an adapter sets
 *   does not hide it; and by a `.this` author, so a role that declares the same command by hand
 *   is narrowed as its own
 * .note = a budget-only sweep (no mod armed) is narrowed as any other hook: it rides the holders
 *   of its carrier role alone
 */
export const isHookOfRepoModSweep = (input: {
  author: string;
  command: string;
  isArmedByMods: boolean;
}): boolean =>
  input.isArmedByMods &&
  input.author.split('/').includes('repo=.this') &&
  input.command.includes(REPO_THIS_BUDGET_HOOK_ARGS);
