import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { asErrorHeadline } from './asErrorHeadline';
import { asRoleModFaultFix } from './asRoleModFaultFix';
import { asRoleModFaultLabel } from './asRoleModFaultLabel';
import { asRoleModFaultsSortedByRole } from './asRoleModFaultsSortedByRole';

/**
 * .what = each role slug once, in code-point order
 * .why = a render may name one role twice; the readout names it once, in a host-stable order
 */
const asRoleSlugsUniqueSorted = (input: { roles: string[] }): string[] =>
  [...new Set(input.roles)].sort();

/**
 * .what = the first fault of each role, in code-point order of the role
 * .why = a role with two faults boots as published once; the readout names it once, by the
 *        fault met first
 */
const asFaultsFirstPerRole = <TFault extends { role: string }>(input: {
  faults: TFault[];
}): TFault[] =>
  asRoleModFaultsSortedByRole({
    faults: input.faults.filter(
      (one, index) =>
        input.faults.findIndex((peer) => peer.role === one.role) === index,
    ),
  });

/**
 * .what = the readout a render prints once it rewrote a modded view or met a mod no role
 *         carries, or naught
 * .why = a live clone read its boot at session start and never re-reads it; the author who
 *        just changed a mod must hear, at the render, that live clones keep their prior boot
 *        until re-enrolled (usecase 8). a mod refused before it found its role (an `of:` that
 *        names no linked role) marks no role dir, so no boot raises it; the render is the one
 *        place left to name it (usecase 6)
 *
 * .note = no view changed and no mod unplaced → no lines; a render that changed naught stays
 *   silent
 */
export const asRoleModViewsChangedReadout = (input: {
  roles: string[];
  reverted: string[];

  /**
   * each mod the render skipped, by its role; its role boots as published until it is cured
   *
   * .note = a role named twice is named once, by its first fault
   */
  skipped: Array<{ role: string; error: Error }>;
  unplaced: Array<{ role: string; error: Error }>;
}): string[] => {
  const roles = asRoleSlugsUniqueSorted({ roles: input.roles });
  const reverted = asRoleSlugsUniqueSorted({ roles: input.reverted });
  const skipped = asFaultsFirstPerRole({ faults: input.skipped });
  const unplaced = asRoleModFaultsSortedByRole({ faults: input.unplaced });
  const branches: string[][] = [
    ...(roles.length > 0
      ? [
          [
            'rendered',
            ...asTreeBranchLines({
              rows: roles.map((role) => `role=${role}`),
              indent: '',
            }),
          ],
        ]
      : []),
    ...(reverted.length > 0
      ? [
          [
            'returned to published, its mod gone',
            ...asTreeBranchLines({
              rows: reverted.map((role) => `role=${role}`),
              indent: '',
            }),
          ],
        ]
      : []),
    ...(skipped.length > 0
      ? [
          [
            'skipped, booted as published until cured',
            ...skipped.flatMap((one, index) =>
              asFaultLines({
                one,
                position: { index, length: skipped.length },
              }),
            ),
          ],
        ]
      : []),
    ...(unplaced.length > 0
      ? [
          [
            'refused, with no linked role to carry it',
            ...unplaced.flatMap((one, index) =>
              asFaultLines({
                one,
                position: { index, length: unplaced.length },
              }),
            ),
          ],
        ]
      : []),

    // the tip is the last branch, as every tip is, so it never splits the facts above it
    ...(roles.length + reverted.length > 0 ? [[TIP_LIVE_CLONE]] : []),
  ];
  if (branches.length === 0) return [];
  return [
    '🧢 .agent/repo=.mods',
    ...branches.flatMap((branch, index) => {
      const position = { index, length: branches.length };
      const [head, ...leaves] = branch;

      // a spacer sets the tip apart, so it never reads as a leaf of the group above it
      const spacer = head === TIP_LIVE_CLONE && index > 0 ? ['   │'] : [];
      return [
        ...spacer,
        `   ${getOneTreeElbow(position)} ${head}`,
        ...leaves.map((leaf) => `   ${getOneTreeSpine(position)}${leaf}`),
      ];
    }),
  ];
};

/**
 * .what = the tip a render that changed a view closes with
 */
const TIP_LIVE_CLONE =
  'a live clone keeps the boot it read at session start; re-enroll it to pick up the change';

/**
 * .what = one unplaced mod or stray entry: its headline, and the fix its refusal carries as a leaf
 * .why = no role exists for `rhx roles boot` to print the whole refusal, so the render must
 *        carry the fix itself
 */
const asFaultLines = (input: {
  one: { role: string; error: Error };
  position: { index: number; length: number };
}): string[] => {
  const fix = asRoleModFaultFix({ error: input.one.error });

  // a stray entry, or an unreadable mods path, names no role, so it is named by its path
  const label = asRoleModFaultLabel(input.one);
  return [
    `${getOneTreeElbow(input.position)} ${label} — ${asErrorHeadline({ error: input.one.error })}`,
    ...(fix ? [`${getOneTreeSpine(input.position)}└─ fix = ${fix}`] : []),
  ];
};
