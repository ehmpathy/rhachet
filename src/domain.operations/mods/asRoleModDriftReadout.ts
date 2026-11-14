import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

/**
 * .what = the pester treestruct for one modded role whose installed version moved
 * .why = a release is the one moment to re-read every mod, so the readout lists each, then
 *        names the one-line fix (vision `### the version pester`)
 *
 * .note = indented to sit under one header — `asRoleModDriftHookReadout` nests it under the
 *   stop hook's `✋` branch, by an `indent` that carries the branch's spine; `rhx upgrade`
 *   prints it under its own notice line, at the default indent
 */
export const asRoleModDriftReadout = (
  input: {
    role: string;
    versionDeclared: string;
    versionInstalled: string;
    pathToSpec: string;
    plan: RoleModPlan;
  },
  options?: { indent?: string },
): string[] => {
  const indent = options?.indent ?? '   ';

  // the mods to review, one row each, marked with the bhuild change legend like the boot notice
  const items = [
    ...input.plan.shadows.map((path) => `[~] shadow ${path}`),
    ...input.plan.adds.map((path) => `[+] add ${path}`),
    ...input.plan.nots.map((path) => `[-] not ${path}`),
  ];

  // the readout's own branches; the mods hang below the review prompt, off the spine
  const branches = [
    { head: `role    = ${input.role}`, children: [] },
    {
      head: `mods    = ${input.versionDeclared}   (declared in ${input.pathToSpec})`,
      children: [],
    },
    { head: `now     = ${input.versionInstalled}`, children: [] },
    { head: 'review each mod against the new release', children: items },
    {
      head: `then set \`of: ${input.role}@${input.versionInstalled}\` in the mod boot.yml`,
      children: [],
    },
  ];
  return branches.flatMap((branch, index) => {
    const position = { index, length: branches.length };
    return [
      `${indent}${getOneTreeElbow(position)} ${branch.head}`,
      ...asTreeBranchLines({
        rows: branch.children,
        indent: `${indent}${getOneTreeSpine(position)}`,
      }),
    ];
  });
};
