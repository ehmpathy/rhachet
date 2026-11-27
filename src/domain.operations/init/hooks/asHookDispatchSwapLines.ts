import type { HookDispatchSwap } from '@src/domain.operations/brains/dispatch/setHookDispatchersForTarget';

/**
 * .what = the report lines for each brain whose dispatchers the sync wrote
 * .why = the sync turns one settings hook per rule into one dispatcher per event; a human must
 *   see that shape (`N rules → M dispatchers`, and how many rules each event's dispatcher runs),
 *   the role hooks that left the settings, and where the rules now live, or a first sync reads as
 *   `no changes needed` while the settings changed
 *
 * .note = a brain whose dispatchers were already in place, with no role hook to move, prints
 *   naught, so a re-sync stays quiet
 */
export const asHookDispatchSwapLines = (input: {
  swaps: HookDispatchSwap[];
}): string[] => {
  const swapsChanged = input.swaps.filter(
    (swap) => swap.dispatchersSet > 0 || swap.roleHooksTakenBack > 0,
  );
  if (swapsChanged.length === 0) return [];
  return [
    '🪝 hook dispatchers set',
    ...swapsChanged.flatMap((swap, index) => {
      const isLast = index === swapsChanged.length - 1;
      const trunk = isLast ? '   └─' : '   ├─';
      const stem = isLast ? '      ' : '   │  ';
      const rows: Array<{ text: string; children: string[] }> = [
        {
          text: `${swap.rules} ${asNoun({ count: swap.rules, noun: 'rule' })} → ${swap.dispatchers} ${asNoun({ count: swap.dispatchers, noun: 'dispatcher' })}${swap.dispatchers > 0 ? ', one per event' : ''}`,
          children: swap.rulesByEvent.map(
            (each) =>
              `${each.event} = ${each.rules} ${asNoun({ count: each.rules, noun: 'rule' })}`,
          ),
        },
        ...(swap.roleHooksTakenBack > 0
          ? [
              {
                text: `${swap.roleHooksTakenBack} role ${asNoun({ count: swap.roleHooksTakenBack, noun: 'hook' })} moved from the settings into the manifest`,
                children: [],
              },
            ]
          : []),
        { text: `manifest = ${swap.manifestPathRel}`, children: [] },
      ];
      return [
        `${trunk} ${swap.brain}`,
        ...rows.flatMap((row, rowIndex) => {
          const isRowLast = rowIndex === rows.length - 1;
          const bar = isRowLast ? '   ' : '│  ';
          return [
            `${stem}${isRowLast ? '└─' : '├─'} ${row.text}`,
            ...row.children.map(
              (child, childIndex) =>
                `${stem}${bar}${childIndex === row.children.length - 1 ? '└─' : '├─'} ${child}`,
            ),
          ];
        }),
      ];
    }),
  ];
};

/**
 * .what = a count's noun, singular for one
 */
const asNoun = (input: { count: number; noun: string }): string =>
  input.count === 1 ? input.noun : `${input.noun}s`;
