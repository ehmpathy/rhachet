import type { BootBudget } from '@src/domain.objects/RoleBootSpec';

import { isBootSpecForeign } from './isBootSpecForeign';

/**
 * .what = the rung a budget breach lands on for one spec — refuse it, or merely say it
 * .why = the choice is the whole of requirement 8, and it turns on ONE question: can the
 *        caller write the file a fix would name?
 *          - the spec is this repo's → `halt`. every remedy on the ladder is theirs to take
 *          - the spec is a symlink into a version-pinned store → `warn`. a halt there would
 *            stop a boot on a file the caller cannot edit, which is a wall rather than a gate
 *
 * .note = its one caller is `roles boot` (`bootRoleResources`). `assertRegistryWithinBudget`
 *   always halts, since git tracks no symlink into `node_modules` and so no foreign spec
 *   reaches it. `roles cost --all` reports every spec and refuses none;
 *   `roles cost --all --when hook.onStop` refuses only the owned ones.
 *
 * .note = an absent budget returns before the `isBootSpecForeign` lstat, so an unbudgeted
 *   boot touches neither the tokenizer nor the filesystem (requirement 4). its `halt` is
 *   inert: `assertBootWithinBudget` returns before it reads the rung
 */
export const getOneBootBudgetRung = (input: {
  budget: BootBudget | null;
  pathToSpec: string;
  cwd: string;
}): 'warn' | 'halt' => {
  if (!input.budget) return 'halt';

  return isBootSpecForeign({
    pathToSpec: input.pathToSpec,
    cwd: input.cwd,
  })
    ? 'warn'
    : 'halt';
};
