import type { Command } from 'commander';

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
    .description('reach an enrolled clone: list, say, get, whoami, prune');

  invokeCloneList({ clone });
  invokeCloneSay({ clone });
  invokeCloneGet({ clone });
  invokeCloneWhoami({ clone });
  invokeClonePrune({ clone });
};
