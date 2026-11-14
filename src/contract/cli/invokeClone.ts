import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import { asCloneVerbAbsentHint } from '@src/domain.operations/clone/cli/asCloneVerbAbsentHint';

import { asCommandVerbNames } from './asCommandVerbNames';
import { invokeCloneGet } from './invokeCloneGet';
import { invokeCloneList } from './invokeCloneList';
import { invokeClonePrune } from './invokeClonePrune';
import { invokeCloneSay } from './invokeCloneSay';
import { invokeCloneWhoami } from './invokeCloneWhoami';

/**
 * .what = register the `rhx clone` command group and its talk + lifecycle verbs
 * .why = a clone is what crons/comms/self-management REACH; this group carries the
 *   reach surface — list (find), say (dispatch), get (observe), whoami (self-id) —
 *   plus prune (reap the dead), the one lifecycle-cleanup verb this behavior owns
 *
 * .note = the BAKE lifecycle (make/fork/wake) is the `rhx clone` dream, out of
 *   scope here — this behavior delivers the frame, the talk surface, and prune
 */
export const invokeClone = ({ program }: { program: Command }): void => {
  const clone = program
    .command('clone')
    .description('reach an enrolled clone: list, say, get, whoami, prune')
    .addHelpText(
      'after',
      '\nactor form:\n  rhx clone @<slug>   spawn a clone of an actor declared in .agent/actors.yml (≡ rhx enroll @<slug>)',
    );

  invokeCloneList({ clone });
  invokeCloneSay({ clone });
  invokeCloneGet({ clone });
  invokeCloneWhoami({ clone });
  invokeClonePrune({ clone });

  // refuse an operand that names no verb — the inline form typed on clone, or a typo
  // .note = a sync throw here reaches invoke's top-level catch, which frames it
  // .note = commander emits this before its unknown-option check, so `--roles` never masks it
  clone.on('command:*', (operands: string[]) => {
    const operand = operands[0] ?? '';
    throw new ConstraintError(`rhx clone has no verb '${operand}'`, {
      operand,
      hint: asCloneVerbAbsentHint({
        operand,
        verbs: asCommandVerbNames({ command: clone }),
      }),
    });
  });
};
