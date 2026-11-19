import { BOOT_DRIFT_CARRY_LINES_MAX } from '@src/domain.operations/boot/BOOT_DRIFT_CARRY_LINES_MAX';
import { BOOT_REVISION_DIR_PREFIX } from '@src/domain.operations/boot/constants';

import { BOOT_DRIFT_NUDGE_LINES } from './BOOT_DRIFT_NUDGE_LINES';
import type { CloneBootDrift } from './CloneBootDrift';
import { isBootDriftOverThreshold } from './isBootDriftOverThreshold';

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
  drift: CloneBootDrift;
}): string[] => {
  // a clone from before boot drift: say so, plainly
  if (input.drift.kind === 'legacy')
    return [
      `😶 boot drift of ${input.address}`,
      '   └─ spawned before boot drift, so it holds its spawn boot until a respawn',
    ];

  // a resume: its boot is its session's, which no record names; never read as current
  if (input.drift.kind === 'resumed')
    return [
      `😶 boot drift of ${input.address}`,
      '   ├─ a resume holds the boot its session first recorded, which no record here names',
      '   └─ it takes no drift at any compaction; respawn it to take the current boot',
    ];

  // no drift: the clone holds the current boot
  if (input.drift.kind === 'current')
    return [
      `😶 boot drift of ${input.address}`,
      `   ├─ spawn revision = ${BOOT_REVISION_DIR_PREFIX}${input.drift.revision}`,
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

  // past the cap, the drift file carries no block: a compaction takes naught, so respawn is the one cure
  const capLine = `past the ${BOOT_DRIFT_CARRY_LINES_MAX} line cap, the drift carries no block, so a compaction takes naught`;
  if (input.drift.capped && input.for === 'nudge')
    return [
      '😶 boot drift',
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      `   ├─ ${capLine}`,
      '   └─ to take it, respawn — the new boot loads whole, from the shared cache',
    ];
  if (input.drift.capped)
    return [
      `😶 boot drift of ${input.address}`,
      `   ├─ spawn revision = ${BOOT_REVISION_DIR_PREFIX}${input.drift.revision}`,
      `   ├─ drift = ${input.drift.drift}`,
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      `   └─ ${capLine}; only a respawn takes the current boot`,
    ];

  // a change outside the briefs alone: the drift carries no block to take, so respawn is the one cure
  const isOutsideOnly = input.drift.outside && blocks === 0;
  if (isOutsideOnly && input.for === 'nudge')
    return [
      '😶 boot drift',
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      '   └─ to take it, respawn — the new boot loads whole, from the shared cache',
    ];
  if (isOutsideOnly)
    return [
      `😶 boot drift of ${input.address}`,
      `   ├─ spawn revision = ${BOOT_REVISION_DIR_PREFIX}${input.drift.revision}`,
      `   ├─ drift = ${input.drift.drift}`,
      `   ├─ ${blocksLine}`,
      `   └─ ${sizeLine}; a compaction takes naught of it, so respawn the clone`,
    ];

  // the nudge: to the clone, with the two ways out
  if (input.for === 'nudge')
    return [
      '😶 boot drift',
      `   ├─ ${blocksLine}`,
      `   ├─ ${sizeLine}`,
      ...outsideLines,
      `   ├─ if you already hold drift = ${input.drift.drift}, a compaction took it; naught is owed`,
      '   └─ to take it',
      '      ├─ /compact — reads the drift in, the conversation kept; a clone cannot run it, so ask your enroller to send it',
      `      │  ├─ rhx clone say ${input.address} --what /compact`,
      `      │  └─ after it, you should hold drift = ${input.drift.drift}`,
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
    `😶 boot drift of ${input.address}`,
    `   ├─ spawn revision = ${BOOT_REVISION_DIR_PREFIX}${input.drift.revision}`,
    `   ├─ drift = ${input.drift.drift}`,
    `   ├─ ${blocksLine}`,
    `   ├─ ${sizeLine}`,
    ...outsideLines,
    '   ├─ the clone reads the drift in at its next compaction',
    ...takeNowLines,
    `   └─ after a compaction it holds drift = ${input.drift.drift}; if it does not, respawn it`,
  ];
};
