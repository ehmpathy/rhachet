import { asBootBlocks } from './asBootBlocks';
import { asBootContentHash } from './asBootContentHash';
import { asBootResidualLines } from './asBootResidualLines';

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
  counts: { changed: number; added: number; removed: number };
  outside: boolean;
} => {
  // index both boots by block key
  const blocksSpawned = new Map(
    asBootBlocks({ corpus: input.bootSpawned }).map((block) => [
      block.key,
      block.text,
    ]),
  );
  const blocksCurrent = asBootBlocks({ corpus: input.bootCurrent });
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
  const residualSpawned = asBootResidualLines({ corpus: input.bootSpawned });
  const residualCurrent = asBootResidualLines({ corpus: input.bootCurrent });
  const residualGained = residualCurrent.filter(
    (line) => !residualSpawned.includes(line),
  );
  const residualLost = residualSpawned.filter(
    (line) => !residualCurrent.includes(line),
  );
  const residualMoved = residualGained.length + residualLost.length > 0;

  // a byte change no block and no residual line names: whitespace or order only, still drift
  const isBlockDriftAbsent =
    changed.length + added.length + removed.length === 0;
  const isShapeOnly =
    isBlockDriftAbsent &&
    !residualMoved &&
    input.bootSpawned !== input.bootCurrent;
  const outside = residualMoved || isShapeOnly;

  // no drift: naught to carry
  if (isBlockDriftAbsent && !outside)
    return { markdown: null, drift: null, lines: 0, counts, outside };

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
          isShapeOnly
            ? 'the boot changed in whitespace or order only, where no block above can carry it. respawn to take it.'
            : 'the boot changed outside any brief, where no block above can carry it. respawn to take it.',
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
  const markdown = [
    '# boot drift since this clone spawned',
    '',
    `drift = ${drift}`,
    '',
    'your system prompt holds the boot as it was when you spawned. the boot has changed since.',
    'each block below supersedes the block of the same path in your system prompt; a block',
    'listed as removed no longer boots. asked which boot drift you hold, name the drift above.',
    '',
    body,
    '',
  ].join('\n');
  return {
    markdown,
    drift,
    lines: markdown.split('\n').length - 1, // the markdown ends in a newline, which opens no line
    counts,
    outside,
  };
};
