import { asBootContentHash } from './asBootContentHash';
import { asBootPartition } from './asBootPartition';
import { BOOT_DRIFT_CARRY_LINES_MAX } from './BOOT_DRIFT_CARRY_LINES_MAX';
import type { BootDeltaCounts } from './BootDeltaCounts';

/**
 * .what = the drift of a boot since a clone spawned: each block changed, added, or left, plus any
 *         change outside the blocks, rendered as the markdown a clone reads beside the boot it
 *         spawned with
 * .why = a clone's system prompt holds the boot it spawned with, recorded once, so a later boot
 *        edit cannot reach it there. the delta rides the clone's own `CLAUDE.md`, which claude
 *        re-reads at compaction: a live clone takes the edit with its conversation kept, while the
 *        boot itself stays the cached prefix every clone of the role set shares
 *
 * .note = `drift` is the delta's own content hash, stated on the delta's first lines, so a clone,
 *         its enroller, or an inspector can check whether a compacted clone holds it
 * .note = `lines` is the delta's size, the figure the drift nudge compares to its threshold
 * .note = past `BOOT_DRIFT_CARRY_LINES_MAX`, `markdown` is a stub that names the drift and says to
 *         respawn; `drift` and `lines` still describe the whole delta, so the nudge still fires,
 *         and `capped` says so, so the readout names respawn as the one cure
 * .note = a byte change never yields `markdown: null`: a change outside every block, or in
 *         whitespace or order alone, renders the `## outside the briefs` section, whose cure is a
 *         respawn
 */
export const asBootDelta = (input: {
  bootSpawned: string;
  bootCurrent: string;
}): {
  markdown: string | null;
  drift: string | null;
  lines: number;
  counts: BootDeltaCounts;
  outside: boolean;
  capped: boolean;
} => {
  // identical bytes: no drift, known before any parse (the stop hook of every current clone)
  if (input.bootSpawned === input.bootCurrent)
    return {
      markdown: null,
      drift: null,
      lines: 0,
      counts: { changed: 0, added: 0, removed: 0 },
      outside: false,
      capped: false,
    };

  // parse each boot once, into its blocks and its residual
  const partSpawned = asBootPartition({ corpus: input.bootSpawned });
  const partCurrent = asBootPartition({ corpus: input.bootCurrent });

  // index both boots by block key
  const blocksSpawned = new Map(
    partSpawned.blocks.map((block) => [block.key, block.text]),
  );
  const blocksCurrent = partCurrent.blocks;
  const keysCurrent = new Set(blocksCurrent.map((block) => block.key));

  // sort each current block: changed or added; then the spawned blocks now absent
  const changed = blocksCurrent.filter(
    (block) =>
      blocksSpawned.has(block.key) &&
      blocksSpawned.get(block.key) !== block.text,
  );
  const added = blocksCurrent.filter((block) => !blocksSpawned.has(block.key));
  const removed = [...blocksSpawned.keys()].filter(
    (key) => !keysCurrent.has(key),
  );
  const counts = {
    changed: changed.length,
    added: added.length,
    removed: removed.length,
  };

  // the text outside every block: lines the current boot gained there, and how many it lost
  const residualSpawned = new Set(partSpawned.residual);
  const residualCurrent = new Set(partCurrent.residual);
  const residualGained = partCurrent.residual.filter(
    (line) => !residualSpawned.has(line),
  );
  const residualLost = partSpawned.residual.filter(
    (line) => !residualCurrent.has(line),
  );
  const residualMoved = residualGained.length + residualLost.length > 0;

  // a byte change no block and no residual line names: whitespace or order only, still drift
  const isBlockDriftAbsent =
    changed.length + added.length + removed.length === 0;
  const isShapeOnly =
    isBlockDriftAbsent &&
    !residualMoved &&
    input.bootSpawned !== input.bootCurrent;
  // a block's close tag left in the residual means a brief quoted one at a line start: a block
  // above may be cut short, so its carried text cannot be trusted to stand for the whole brief
  // (a wrapper's close, such as `</also>`, names no block tag and is plain residual)
  const blockCloseTags = new Set(
    partCurrent.blocks.map((block) => `</${block.tag}>`),
  );
  const isBlockCutShort =
    !isBlockDriftAbsent &&
    partCurrent.residual.some((line) => blockCloseTags.has(line));
  const outside = residualMoved || isShapeOnly || isBlockCutShort;
  const outsideReason = (() => {
    if (isShapeOnly)
      return 'the boot changed in whitespace or order only, where no block above can carry it. respawn to take it.';
    if (residualMoved)
      return 'the boot changed outside any brief, where no block above can carry it. respawn to take it.';
    return 'a brief quotes a close tag at a line start, so a block above may be cut short. respawn to take the whole boot.';
  })();

  // no drift: naught to carry
  if (isBlockDriftAbsent && !outside)
    return {
      markdown: null,
      drift: null,
      lines: 0,
      counts,
      outside,
      capped: false,
    };

  // the body: one section per kind
  const body = [
    ...(changed.length
      ? ['## changed', '', ...changed.map((block) => `${block.text}\n`)]
      : []),
    ...(added.length
      ? ['## added', '', ...added.map((block) => `${block.text}\n`)]
      : []),
    ...(removed.length
      ? ['## removed', '', ...removed.map((key) => `- ${key}`), '']
      : []),
    ...(outside
      ? [
          '## outside the briefs',
          '',
          outsideReason,
          ...(residualGained.length
            ? ['', '```', ...residualGained, '```']
            : []),
          ...(residualLost.length
            ? [
                '',
                `${residualLost.length} line(s) outside the briefs were removed.`,
              ]
            : []),
          '',
        ]
      : []),
  ]
    .join('\n')
    .trimEnd();

  // the lead names the drift, so a clone can say which drift it holds
  const drift = asBootContentHash({ bytes: body });
  const lead = [
    '# boot drift since this clone spawned',
    '',
    `drift = ${drift}`,
    '',
  ];
  const markdown = [
    ...lead,
    'your system prompt holds the boot as it was when you spawned. the boot has changed since.',
    'each block below supersedes the block of the same path in your system prompt; a block',
    'listed as removed no longer boots. asked which boot drift you hold, name the drift above.',
    '',
    body,
    '',
  ].join('\n');
  const lines = markdown.split('\n').length - 1; // the markdown ends in a newline, which opens no line

  // past the cap, carry a stub: a compaction would spend its headroom on a drift this large
  if (lines > BOOT_DRIFT_CARRY_LINES_MAX)
    return {
      markdown: [
        ...lead,
        `the boot has changed since you spawned, by ${lines} lines, past the ${BOOT_DRIFT_CARRY_LINES_MAX} line cap a compaction carries.`,
        'so no block is carried here: respawn to take the current boot, which loads whole from the shared cache.',
        '',
      ].join('\n'),
      drift,
      lines,
      counts,
      outside,
      capped: true,
    };
  return { markdown, drift, lines, counts, outside, capped: false };
};
