import { HelpfulError } from 'helpful-errors';

import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { asErrorHeadline } from './asErrorHeadline';

/**
 * .what = the code-point order of two strings, as a sort comparator
 * .why = the same order a bare `.sort()` gives the other two lists; `localeCompare` would follow
 *        the host's collation, so one input could render two orders on two hosts
 */
const asCodePointOrder = (input: { a: string; b: string }): number => {
  if (input.a < input.b) return -1;
  if (input.a > input.b) return 1;
  return 0;
};

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
  unplaced: Array<{ role: string; error: Error }>;
}): string[] => {
  const roles = [...new Set(input.roles)].sort();
  const reverted = [...new Set(input.reverted)].sort();
  const unplaced = [...input.unplaced].sort((a, b) =>
    asCodePointOrder({ a: a.role, b: b.role }),
  );
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
    ...(roles.length + reverted.length > 0
      ? [
          [
            'a live clone keeps the boot it read at session start; re-enroll it to pick up the change',
          ],
        ]
      : []),
    ...(unplaced.length > 0
      ? [
          [
            'refused, with no linked role to carry it',
            ...unplaced.flatMap((one, index) =>
              asUnplacedLines({
                one,
                position: { index, length: unplaced.length },
              }),
            ),
          ],
        ]
      : []),
  ];
  if (branches.length === 0) return [];
  return [
    '🧢 .agent/repo=.mods',
    ...branches.flatMap((branch, index) => {
      const position = { index, length: branches.length };
      const [head, ...leaves] = branch;
      return [
        `   ${getOneTreeElbow(position)} ${head}`,
        ...leaves.map((leaf) => `   ${getOneTreeSpine(position)}${leaf}`),
      ];
    }),
  ];
};

/**
 * .what = one unplaced mod or stray entry: its headline, and the fix its refusal carries as a leaf
 * .why = no role exists for `rhx roles boot` to print the whole refusal, so the render must
 *        carry the fix itself
 */
const asUnplacedLines = (input: {
  one: { role: string; error: Error };
  position: { index: number; length: number };
}): string[] => {
  const metadata =
    input.one.error instanceof HelpfulError
      ? (input.one.error.metadata ?? {})
      : {};
  const fix = typeof metadata.fix === 'string' ? metadata.fix : null;

  // a stray entry of the mods dir names no role, so it is named by its path
  const label =
    typeof metadata.entry === 'string'
      ? `.agent/repo=.mods/${metadata.entry}`
      : `role=${input.one.role}`;
  return [
    `${getOneTreeElbow(input.position)} ${label} — ${asErrorHeadline({ error: input.one.error })}`,
    ...(fix ? [`${getOneTreeSpine(input.position)}└─ fix = ${fix}`] : []),
  ];
};
