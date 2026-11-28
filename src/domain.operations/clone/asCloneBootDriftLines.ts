import { BOOT_DRIFT_CARRY_LINES_MAX } from '@src/domain.operations/boot/BOOT_DRIFT_CARRY_LINES_MAX';

import { BOOT_DRIFT_NUDGE_LINES } from './BOOT_DRIFT_NUDGE_LINES';
import type { CloneBootDrift } from './CloneBootDrift';
import { isBootDriftOverThreshold } from './isBootDriftOverThreshold';

/**
 * .what = the tree a human reads for one clone's boot drift
 * .why = one shape for the inspector (`--of`) and the onStop notice, so the two read alike
 *
 * .note = `for = nudge` is the onStop notice: it reaches the human who watches the clone's
 *         session (a hook `systemMessage`), never the clone itself, which cannot reliably compact
 *         itself. it names the two ways out. `for = inspect` speaks to an editor or an enroller
 *         and names the check a compacted clone must pass
 * .note = the copy never says the drift loaded: it reads disk, and cannot see the clone's memory
 */
export const asCloneBootDriftLines = (input: {
  for: 'nudge' | 'inspect';
  address: string;
  drift: CloneBootDrift;
}): string[] => {
  const header = `😶 boot drift of ${input.address}`;

  // a clone from before boot drift: say so, plainly
  if (input.drift.kind === 'legacy')
    return [
      header,
      '   └─ spawned before boot drift, so it holds its spawn boot until a respawn',
    ];

  // a resume: its boot is its session's, which no record names; never read as current
  if (input.drift.kind === 'resumed')
    return [
      header,
      '   ├─ a resume holds the boot its session first recorded, which no record here names',
      '   └─ it takes no drift at any compaction; respawn it to take the current boot',
    ];

  // no drift: the clone holds the current boot
  const spawnLine = `   ├─ spawn boot = ${input.drift.spawned}`;
  if (input.drift.kind === 'current')
    return [
      header,
      spawnLine,
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
  // .note = with no block drift, the outside change is the whole change, so the blocks row says it
  //   and the `also` row stays silent; `also` speaks only beside a block drift
  const blocksLine = (() => {
    if (blocks > 0)
      return `${blocks} block${blocks === 1 ? '' : 's'} drifted since this clone spawned (${parts.join(', ')})`;
    if (input.drift.outside)
      return 'no block drifted; the boot changed outside the briefs, which only a respawn takes';
    return 'no block drifted; the change sits in whitespace and order alone';
  })();
  const isOver = isBootDriftOverThreshold({ lines: input.drift.lines });
  const sizeLine = `${input.drift.lines} lines of drift, ${isOver ? 'over' : 'under'} the ${BOOT_DRIFT_NUDGE_LINES} line threshold`;
  const outsideLines =
    input.drift.outside && blocks > 0
      ? [
          '   ├─ the boot also changed outside the briefs, which only a respawn takes',
        ]
      : [];
  const respawnOnlyLine =
    '   └─ to take it, respawn the clone — the new boot loads whole, from the shared cache';

  // past the cap, the drift file carries no block: a compaction takes naught, so respawn is the one cure
  const capLine = `past the ${BOOT_DRIFT_CARRY_LINES_MAX} line cap, the drift carries no block, so a compaction takes naught`;
  if (input.drift.capped && input.for === 'nudge')
    return [
      header,
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      `   ├─ ${capLine}`,
      respawnOnlyLine,
    ];
  if (input.drift.capped)
    return [
      header,
      spawnLine,
      `   ├─ drift = ${input.drift.drift}`,
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      `   └─ ${capLine}; only a respawn takes the current boot`,
    ];

  // a change outside the briefs alone: the drift carries no block to take, so respawn is the one cure
  const isOutsideOnly = input.drift.outside && blocks === 0;
  if (isOutsideOnly && input.for === 'nudge')
    return [
      header,
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      respawnOnlyLine,
    ];
  if (isOutsideOnly)
    return [
      header,
      spawnLine,
      `   ├─ drift = ${input.drift.drift}`,
      `   ├─ ${blocksLine}`,
      `   └─ ${sizeLine}; a compaction takes naught of it, so respawn the clone`,
    ];

  // the notice: to the human who watches the clone, with the two ways out
  if (input.for === 'nudge')
    return [
      header,
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      ...outsideLines,
      '   └─ to take it',
      '      ├─ /compact — the clone reads the drift in, its conversation kept',
      `      │  ├─ type it in this session, or send it: rhx clone say ${input.address} --what /compact`,
      `      │  └─ after it, the clone holds drift = ${input.drift.drift}`,
      '      └─ respawn — the new boot loads whole, from the shared cache; the sure cure',
    ];

  // the inspector: to an editor or an enroller, with when the drift lands and the check it passed
  const takeNowLines = isOver
    ? [
        '   ├─ to take it now',
        `   │  └─ rhx clone say ${input.address} --what /compact`,
      ]
    : [];
  return [
    header,
    spawnLine,
    `   ├─ drift = ${input.drift.drift}`,
    `   ├─ ${blocksLine}`,
    `   ├─ ${sizeLine}`,
    ...outsideLines,
    '   ├─ the clone reads the drift in at its next compaction',
    ...takeNowLines,
    `   └─ after a compaction it holds drift = ${input.drift.drift}; if it does not, respawn it`,
  ];
};
