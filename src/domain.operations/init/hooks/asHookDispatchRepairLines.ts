import type { HookDispatchManifestRepair } from '@src/domain.operations/brains/dispatch/setHookDispatchManifestsRepairedForTarget';

/**
 * .what = the report lines for each manifest the sync rewrote past a corrupt row
 * .why = a corrupt row is dropped, never guessed at; a human must see which file was rewritten and
 *   how many rows it cost, so a hand-added row that was lost can be added back
 *
 * .note = no repair prints naught
 */
export const asHookDispatchRepairLines = (input: {
  repairs: HookDispatchManifestRepair[];
}): string[] => {
  if (input.repairs.length === 0) return [];
  return [
    '🪝 hook dispatch manifest rewritten past corrupt rows',
    ...input.repairs.flatMap((repair, index) => {
      const isLast = index === input.repairs.length - 1;
      const trunk = isLast ? '   └─' : '   ├─';
      const stem = isLast ? '      ' : '   │  ';
      return [
        `${trunk} ${repair.brain}`,
        `${stem}├─ ${repair.linesDropped} corrupt ${repair.linesDropped === 1 ? 'row' : 'rows'} dropped`,
        `${stem}└─ manifest = ${repair.manifestPathRel}`,
      ];
    }),
  ];
};
