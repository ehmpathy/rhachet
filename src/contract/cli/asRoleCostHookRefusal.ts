import { ConstraintError } from 'helpful-errors';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import { asRoleContentDefectLabels } from '@src/domain.operations/boot/asRoleContentDefectLabels';

import { relative } from 'node:path';

/**
 * .what = the one refusal a held stop raises, chosen by its gravest drift
 * .why = a caller branches on the error's message, so each drift kind has its own. the order of
 *        gravity: a boot past its cap, then an owned content defect, then a mod drift alone.
 *        each refusal names every other drift beside it, so one stop carries every fact
 *
 * .note = a held stop holds at least one drift; the hook calls this only past that guard
 * .note = it returns a `ConstraintError`, its metadata typed per refusal; the return type is
 *   inferred, since `helpful-errors` exports no metadata supertype the three would widen to
 */
export const asRoleCostHookRefusal = (input: {
  over: { pathToSpec: string }[];
  defects: RoleContentDefect[];
  drifts: { pathToSpec: string }[];
  cwd: string;
}) => {
  // each drift kind beside the gravest, named only where present
  const factsDrifts =
    input.drifts.length > 0
      ? { modsDrifted: input.drifts.map((one) => one.pathToSpec) }
      : {};
  const factsDefects =
    input.defects.length > 0
      ? { defects: asRoleContentDefectLabels({ defects: input.defects }) }
      : {};

  // a boot past its cap is the gravest
  if (input.over.length > 0)
    return new ConstraintError('boot specs exceed their declared budget', {
      hint: 'trim a resource — catalogize a set, condense or ref a say entry, list one under `not` — or raise budget.tokens deliberately',
      // `specsOver`, never `over` — the boot halt's `over` is a token COUNT, and one key name
      // across the two refusals must hold one type
      specsOver: input.over.map((one) => relative(input.cwd, one.pathToSpec)),
      ...factsDrifts,
      ...factsDefects,
    });

  // an owned content defect is named by its own error, so a caller can branch on it
  if (input.defects.length > 0)
    return new ConstraintError(
      'owned roles hold role content defects that a boot set aside',
      {
        hint: 'repair each file the readout names, then stop again',
        ...factsDefects,
        ...factsDrifts,
      },
    );

  // a mod drift alone
  return new ConstraintError(
    'modded roles moved off the version their mods pin',
    {
      hint: 'review each mod against the installed release, then set its `of:` to the installed version',
      ...factsDrifts,
    },
  );
};
