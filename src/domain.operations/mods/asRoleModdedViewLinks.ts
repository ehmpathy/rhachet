import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';

import { join } from 'node:path';

/**
 * .what = every link a modded view holds: role-relative path → the file it points at
 * .why = the writer builds the view from it and the drift check compares the disk to it, so
 *        the two can never disagree on what a fresh view is
 *
 * .note = a published file stays unless the plan shadows, nots or drops it; each shadow and
 *   each add points into the mod dir
 */
export const asRoleModdedViewLinks = (input: {
  filesPublished: Map<string, string>;
  modDir: string;
  plan: RoleModPlan;
}): Map<string, string> => {
  const pathsHidden = new Set([
    ...input.plan.shadows,
    ...input.plan.nots,
    ...input.plan.minsDropped,
  ]);
  const linksPublished = [...input.filesPublished].filter(
    ([path]) => !pathsHidden.has(path),
  );
  const linksMod = [...input.plan.shadows, ...input.plan.adds].map(
    (path) => [path, join(input.modDir, path)] as const,
  );
  return new Map(
    [...linksPublished, ...linksMod].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    ),
  );
};
