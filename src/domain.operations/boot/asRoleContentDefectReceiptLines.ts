import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';

import { asRoleContentDefectLines } from './asRoleContentDefectLines';

/**
 * .what = the words each reader needs
 * .why = a human at the roster asked for a report, so its receipt names no clone. the tail
 *        promises no repair: an owned defect's row names its fix, a linked one's names the
 *        levers this repo holds, so the tail defers to the rows and reads true for both
 *
 * .note = a clone's arm is its own: a repo may arm the sweep while a clone's roles drop the
 *   carrier, so a clone reads "for this clone", true in both cases. a human reads the repo's arm
 */
const WORDS_BY_READER = {
  clone: {
    tail: 'the clone still boots; each row names its fix',
    unarmedWhere: 'for this clone',
    unarmed: 'this receipt is the one notice',
    armedHold: 'a stop holds this clone until each owned row is repaired',
  },
  human: {
    tail: 'each role still boots; each row names its fix',
    unarmedWhere: 'in this repo',
    unarmed: 'no stop will hold on what it names',
    armedHold: 'a stop holds until each owned row is repaired',
  },
} as const;

/**
 * .what = the last branch of a receipt: what a stop will do with the rows above it
 * .why = a stop holds on owned defects only (F2). where no sweep is armed, no stop names them;
 *        where one is armed, the row says whether a stop will hold, so the reader neither waits
 *        for a hold that will not come nor meets one unannounced
 */
const asReceiptNoteLines = (input: {
  defects: RoleContentDefect[];
  isSweepArmed: boolean;
  words: { unarmedWhere: string; unarmed: string; armedHold: string };
}): string[] => {
  if (!input.isSweepArmed)
    return [
      `   └─ no stop sweep is armed ${input.words.unarmedWhere}, so ${input.words.unarmed}`,
    ];
  const isAnyOwned = input.defects.some(
    (defect) => asRepoSlugKind({ slug: defect.ref.repo }) !== 'package',
  );
  if (isAnyOwned) return [`   └─ ${input.words.armedHold}`];
  return [
    '   └─ each row is a linked role, so a stop names them and holds on none',
  ];
};

/**
 * .what = the receipt a render prints where it set content defects aside
 * .why = a set-aside with no notice is a failhide; the receipt names each defect and its fix,
 *        so the clone that was born can repair what would once have refused its birth
 *
 * .note = a clean render prints naught — the receipt is actionable, never census noise
 * .note = where the repo arms no stop sweep, no stop will name these again, so the receipt says
 *   so (`1.vision.experience.case=7`)
 * .note = `context.getIsSweepArmed` reads the repo's arms, so it rides the context; it is asked
 *   only when a defect is set aside, so a clean render, the common case on every birth, pays no
 *   read of the arms
 * .note = `for` names who reads it, and the receipt picks its words: a clone (at its birth) or a
 *   human (a rerender, or the hand-run roster)
 */
export const asRoleContentDefectReceiptLines = (
  input: {
    defects: RoleContentDefect[];
    for: 'clone' | 'human';
  },
  context: { getIsSweepArmed: () => boolean },
): string[] => {
  if (input.defects.length === 0) return [];
  const noun = `role content defect${input.defects.length === 1 ? '' : 's'}`;
  const words = WORDS_BY_READER[input.for];
  const linesNote = asReceiptNoteLines({
    defects: input.defects,
    isSweepArmed: context.getIsSweepArmed(),
    words,
  });
  return [
    `🟡 boot set aside ${input.defects.length} ${noun} — ${words.tail}`,
    ...asRoleContentDefectLines({
      defects: input.defects,
      indent: '   ',
      peersAfter: linesNote.length,
    }),
    ...linesNote,
  ];
};
