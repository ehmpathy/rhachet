import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

/**
 * .what = the sweep block that names each modded role the roster could not price, or naught
 * .why = the roster holds only the boot specs it could render, so a modded role with no spec,
 *        a stale view, a refused mod, or a mod over no linked role would read as unmodded or
 *        absent; this block names each, so the sweep shows every edited role (usecase 4)
 *
 * .note = no such role → no lines; an unmodded repo's sweep is unchanged
 * .note = a role the roster already priced is named by its row's mark, so the caller passes
 *   only the refs with no row; one state never reads twice on one screen
 */
export const asRoleModsUncostedReadout = (input: {
  refsWithoutSpec: RoleLinkRef[];
  refsStale: RoleLinkRef[];
  refsRefused: RoleLinkRef[];
  slugsUnplaced: string[];
  entriesStray: string[];
}): string[] => {
  const asLabels = (refs: RoleLinkRef[]): string[] =>
    refs.map((ref) => `${ref.repo}/${ref.role}`);
  const groups = [
    {
      mark: '[~] modded, with no boot.yml to cost (rhx roles boot shows what its mod does)',
      labels: asLabels(input.refsWithoutSpec),
    },
    {
      mark: '[~] modded, view not current (rhx init --hooks)',
      labels: asLabels(input.refsStale),
    },
    {
      mark: '[~] modded, refused (rhx roles boot names why)',
      labels: asLabels(input.refsRefused),
    },
    {
      mark: '[~] a mod over no linked role (rhx init --roles <repo>/<role>, or delete the mod)',
      labels: input.slugsUnplaced.map((slug) => `role=${slug}`),
    },
    {
      mark: 'an entry that names no role (rename it to role=<slug>, or move it out)',
      labels: input.entriesStray,
    },
  ].filter((group) => group.labels.length > 0);
  if (groups.length === 0) return [];

  return [
    '🧢 .agent/repo=.mods',
    ...groups.flatMap((group, index) =>
      asGroupLines({
        mark: group.mark,
        labels: group.labels,
        position: { index, length: groups.length },
      }),
    ),
  ];
};

/**
 * .what = one mark branch, with its labels as leaves, sorted
 */
const asGroupLines = (input: {
  mark: string;
  labels: string[];
  position: { index: number; length: number };
}): string[] => [
  `   ${getOneTreeElbow(input.position)} ${input.mark}`,
  ...asTreeBranchLines({
    rows: [...input.labels].sort(),
    indent: `   ${getOneTreeSpine(input.position)}`,
  }),
];
