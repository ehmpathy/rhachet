import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import { asCloneVerbAbsentHint } from '@src/domain.operations/clone/cli/asCloneVerbAbsentHint';

import { asCommandVerbNames } from './asCommandVerbNames';
import { invokeCloneBoot } from './invokeCloneBoot';
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
    .description('reach and inspect enrolled clones')
    .addHelpText(
      'after',
      [
        '',
        'actor form:',
        '  rhx clone @<slug>   alias of rhx clone make @<slug>',
      ].join('\n'),
    );

  // make: spawn a clone of a declared actor
  //   .note = `clone make @<slug> …` is mapped onto the enroll spawn before commander parses
  //     (asArgvWithActorFormAlias), so this action runs only for an operand that is no actor
  clone
    .command('make')
    .description(
      'spawn a clone of an actor declared in .agent/actors.yml: rhx clone make @<slug> [+role|-role] [--brain <brain>] [--as @:<slug>]',
    )
    .argument('[actor]', 'the actor address, @<slug>')
    .allowUnknownOption()
    .action((actor: string | undefined) => {
      throw new ConstraintError('rhx clone make takes an actor address', {
        actor: actor ?? null,
        hint: 'rhx clone make @<slug>, where <slug> is an actor declared in .agent/actors.yml',
      });
    });

  invokeCloneList({ clone });
  invokeCloneSay({ clone });
  invokeCloneGet({ clone });
  invokeCloneWhoami({ clone });
  invokeClonePrune({ clone });
  invokeCloneBoot({ clone });

  // refuse an operand that names no verb — the inline form typed on clone, or a typo
  // .note = a sync throw here reaches invoke's top-level catch, which frames it
  // .note = commander emits this before its unknown-option check, so `--roles` never masks it
  clone.on('command:*', (operands: string[]) => {
    const operand = operands[0] ?? '';
    const { hint, roads } = asCloneVerbAbsentHint({
      operand,
      verbs: asCommandVerbNames({ command: clone }),
    });
    throw new ConstraintError(`rhx clone has no verb '${operand}'`, {
      operand,
      hint,
      roads,
    });
  });
};
