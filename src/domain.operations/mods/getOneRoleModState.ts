import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleModdedViewSource } from '@src/domain.objects/RoleModdedViewRecord';
import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';
import { getOneRoleBootSpecFromRef } from '@src/domain.operations/role/getOneRoleBootSpecFromRef';

import { asRoleModdedViewLinks } from './asRoleModdedViewLinks';
import { assertRoleModModeMatchesRole } from './assertRoleModModeMatchesRole';
import { computeRoleModPlan } from './computeRoleModPlan';
import { getAllRolePublishedFiles } from './getAllRolePublishedFiles';
import { getAllRoleViewSources } from './getAllRoleViewSources';
import { getOneRoleModdedViewRecord } from './getOneRoleModdedViewRecord';
import { getOneRoleModTarget } from './getOneRoleModTarget';

/**
 * .what = all a mod amounts to: its spec, its target, the published role, the plan, the view
 * .why = the sync builds the view from it and the boot checks the view against it; one
 *        derivation keeps the two from any disagreement on what the mod does
 *
 * .note = every refusal but the hook conflict is raised here or in `getOneRoleModTarget`, so a
 *   boot re-derives it with no record; the hook conflict needs the role package, so the sync
 *   records it
 */
export const getOneRoleModState = (input: {
  cwd: string;
  role: string;
  refsLinked: RoleLinkRef[];
}): {
  modDir: string;
  spec: RoleModSpec;
  target: RoleLinkRef;
  roleDir: string;
  sources: { briefs: RoleModdedViewSource[]; skills: RoleModdedViewSource[] };
  plan: RoleModPlan;
  links: Map<string, string>;
} => {
  // the mod, and the linked role it is over
  const { modDir, spec, filesMod, target } = getOneRoleModTarget(input);

  // one mode per merge (F12)
  const specRole = getOneRoleBootSpecFromRef({
    ref: target,
    repoPath: input.cwd,
  });
  assertRoleModModeMatchesRole({ mod: spec, role: specRole });

  // the role as published, whether its view is modded yet or not
  const roleDir = asRoleDir({ cwd: input.cwd, ref: target });
  const record = getOneRoleModdedViewRecord({ roleDir });
  const sources = {
    briefs: getAllRoleViewSources({ roleDir, kind: 'briefs', record }),
    skills: getAllRoleViewSources({ roleDir, kind: 'skills', record }),
  };
  const filesPublished = getAllRolePublishedFiles({ roleDir, sources });

  // what the mod does, and the view that does it
  const plan = computeRoleModPlan({
    spec,
    specRole,
    filesPublished: [...filesPublished.keys()].sort(),
    filesMod,
  });
  const links = asRoleModdedViewLinks({ filesPublished, modDir, plan });

  return { modDir, spec, target, roleDir, sources, plan, links };
};
