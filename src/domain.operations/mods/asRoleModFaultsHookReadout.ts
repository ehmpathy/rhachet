import { ConstraintError } from 'helpful-errors';

import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { asErrorHeadline } from './asErrorHeadline';
import { asRoleModFaultFix } from './asRoleModFaultFix';
import { asRoleModFaultLabel } from './asRoleModFaultLabel';
import { asRoleModFaultsSortedByRole } from './asRoleModFaultsSortedByRole';

/**
 * .what = renders the onStop hook's hold for each mod fault of the repo
 * .why = a skipped mod no longer refuses a boot, so the stop is the surface that cannot be
 *        missed: it names each fault with its fix and holds the first stop of each turn until
 *        each is cured (F02). a mod is the human's own work, so the footer never invites a brain
 *        to delete one unasked. the hold
 *        shares the drift hold's shape: the invocation, the class line, each fault, and the move
 *        that clears it
 */
export const asRoleModFaultsHookReadout = (input: {
  invocation: string;
  faults: Array<{ role: string; error: Error }>;
}): string[] => {
  // a fault, never a skipped mod: a stray file or a file where the mods dir belongs skips naught
  const noun = input.faults.length === 1 ? 'mod fault' : 'mod faults';

  // one branch per fault, in role order so the hold reads the same on every host
  const faults = asRoleModFaultsSortedByRole({ faults: input.faults });
  const linesFaults = faults.flatMap((one, index) => {
    const position = { index, length: faults.length };
    const spine = `   │  ${getOneTreeSpine(position)}`;
    const fix = asRoleModFaultFix({ error: one.error });
    return [
      ...(index > 0 ? ['   │  │'] : []),
      `   │  ${getOneTreeElbow(position)} ${asRoleModFaultLabel(one)}`,
      `${spine}${fix ? '├─' : '└─'} ${asErrorHeadline({ error: one.error })}`,
      ...(fix ? [`${spine}└─ fix = ${fix}`] : []),
    ];
  });

  return [
    `🧢 ${input.invocation}`,
    `   ├─ ${ConstraintError.emoji} ${ConstraintError.name}: ${input.faults.length} ${noun}, held at the first stop of each turn until cured`,
    ...linesFaults,
    `   │`,
    `   └─ ask your human before you delete a mod`,
    ``,
  ];
};
