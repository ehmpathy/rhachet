import { ConstraintError } from 'helpful-errors';

import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { asRoleModDriftReadout } from './asRoleModDriftReadout';

/**
 * .what = renders the onStop hook's hold for mods whose pinned role moved
 * .why = a clone that never boots the modded role still stops, so the stop is where every clone
 *        of the repo learns the mod is now read against a release it was not written for. the
 *        hold shares the budget breach's shape: the invocation, the class line, each drift,
 *        and the one move that clears it
 *
 * .note = each drift is a branch named by its role, which holds the same readout `rhx upgrade`
 *   prints, nested by an indent that carries the branch's spine
 */
export const asRoleModDriftHookReadout = (input: {
  invocation: string;
  drifts: Array<{
    role: string;
    versionDeclared: string;
    versionInstalled: string;
    pathToSpec: string;
    plan: RoleModPlan;
  }>;
}): string[] => {
  const isOne = input.drifts.length === 1;
  const noun = isOne ? 'modded role' : 'modded roles';
  const pin = isOne ? 'its mod pins' : 'their mods pin';

  // one branch per drift, named by its role, its readout nested on the branch's spine
  const linesDrifts = input.drifts.flatMap((drift, index) => {
    const position = { index, length: input.drifts.length };
    return [
      ...(index > 0 ? ['   │  │'] : []),
      `   │  ${getOneTreeElbow(position)} ${drift.role}`,
      ...asRoleModDriftReadout(drift, {
        indent: `   │  ${getOneTreeSpine(position)}`,
      }),
    ];
  });

  return [
    `🧢 ${input.invocation}`,
    `   ├─ ${ConstraintError.emoji} ${ConstraintError.name}: ${input.drifts.length} ${noun} moved off the version ${pin}`,
    ...linesDrifts,
    `   │`,
    `   └─ the stop holds until each mod's \`of:\` names the installed version`,
    ``,
  ];
};
