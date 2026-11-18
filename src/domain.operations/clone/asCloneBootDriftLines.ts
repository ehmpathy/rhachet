/**
 * .what = the line count past which a clone's boot drift nudges it to compact or respawn
 * .why = the brain cli's own docs name 200 lines as the size where a memory file starts to cost
 *        adherence (https://code.claude.com/docs/en/memory); past it, the drift a clone carries
 *        in memory is better shed by a respawn onto the current boot
 */
export const BOOT_DRIFT_NUDGE_LINES = 200;

/**
 * .what = the tree a human or a clone reads for one clone's boot drift
 * .why = one shape for the inspector (`--of`) and the onStop nudge, so the two read alike
 *
 * .note = `for = nudge` speaks to the clone itself and names the two ways out; `for = inspect`
 *         speaks to an editor or an enroller and names the check a compacted clone must pass
 * .note = the copy never says the drift loaded: it reads disk, and cannot see the clone's memory
 */
export const asCloneBootDriftLines = (input: {
  for: 'nudge' | 'inspect';
  address: string;
  drift:
    | { kind: 'legacy' }
    | {
        kind: 'current' | 'drifted';
        revision: string;
        drift: string | null;
        lines: number;
        counts: { changed: number; added: number; removed: number };
        outside: boolean;
      };
}): string[] => {
  // a clone from before boot drift: say so, plainly
  if (input.drift.kind === 'legacy')
    return [
      `😶 boot drift of ${input.address}`,
      '   └─ spawned before boot drift, so it holds its spawn boot until a respawn',
    ];

  // no drift: the clone holds the current boot
  if (input.drift.kind === 'current')
    return [
      `😶 boot drift of ${input.address}`,
      `   ├─ spawn revision = sha256=${input.drift.revision}`,
      '   └─ no drift; the clone holds the current boot',
    ];

  // the drift, in its counts and size
  const { counts } = input.drift;
  const blocks = counts.changed + counts.added + counts.removed;
  const parts = [
    counts.changed ? `${counts.changed} changed` : null,
    counts.added ? `${counts.added} added` : null,
    counts.removed ? `${counts.removed} removed` : null,
  ].filter((part): part is string => part !== null);
  const blocksLine =
    blocks === 0
      ? 'no block drifted; the change sits outside the briefs, or in whitespace and order alone'
      : `${blocks} block${blocks === 1 ? '' : 's'} drifted since this clone spawned (${parts.join(', ')})`;
  const isOver = input.drift.lines > BOOT_DRIFT_NUDGE_LINES;
  const sizeLine = `${input.drift.lines} lines carried, ${isOver ? 'over' : 'under'} the ${BOOT_DRIFT_NUDGE_LINES} line threshold`;
  const outsideLines = input.drift.outside
    ? [
        '   ├─ the boot also changed outside the briefs, which only a respawn takes',
      ]
    : [];

  // the nudge: to the clone, with the two ways out
  if (input.for === 'nudge')
    return [
      '😶 boot drift',
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      ...outsideLines,
      '   └─ to take it',
      `      ├─ /compact — reads the drift in, the conversation kept; after it, you should hold drift = ${input.drift.drift}`,
      '      └─ respawn — the new boot loads whole, from the shared cache; the sure cure',
    ];

  // the inspector: to an editor or an enroller, with the check a compacted clone must pass
  return [
    `😶 boot drift of ${input.address}`,
    `   ├─ spawn revision = sha256=${input.drift.revision}`,
    `   ├─ drift = ${input.drift.drift}`,
    `   ├─ ${blocksLine}`,
    `   ├─ ${sizeLine}`,
    ...outsideLines,
    `   └─ a compacted clone that does not hold drift = ${input.drift.drift} did not take the drift — respawn it`,
  ];
};
