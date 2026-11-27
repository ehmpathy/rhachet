import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { asErrorHeadline } from './asErrorHeadline';
import { asRoleModFaultFix } from './asRoleModFaultFix';
import { asRoleModFaultLabel } from './asRoleModFaultLabel';

/**
 * .what = the readout `rhx upgrade` prints for each mod fault of the repo, or naught
 * .why = an upgrade is the moment a release can drop a path a mod shadows or nots; the human
 *        must hear it there, not first at the next boot of a clone that carries the role. it
 *        reads the stop sweep's own fault set, so the upgrade names every fault the next stop
 *        holds on
 *
 * .note = each fault is one branch, labeled where it lives (a role, a stray, the mods path), with
 *   its headline, and its `fix` as a leaf where it carries one
 * .note = no faults → no lines
 */
export const asRoleModRefusalsUpgradeReadout = (input: {
  faults: Array<{ role: string; error: Error }>;
}): string[] => {
  if (input.faults.length === 0) return [];
  return [
    '🧢 a mod no longer applies',
    ...input.faults.flatMap((one, index) => {
      const position = { index, length: input.faults.length };
      const fix = asRoleModFaultFix({ error: one.error });
      return [
        `   ${getOneTreeElbow(position)} ${asRoleModFaultLabel(one)} — ${asErrorHeadline({ error: one.error })}`,
        ...(fix ? [`   ${getOneTreeSpine(position)}└─ fix = ${fix}`] : []),
      ];
    }),
  ];
};
