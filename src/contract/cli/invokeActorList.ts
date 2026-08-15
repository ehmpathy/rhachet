import type { Command } from 'commander';

import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { isRepoLinked } from '@src/domain.operations/actor/enrolled/isRepoLinked';
import { asActorListView } from '@src/domain.operations/clone/cli/asActorListView';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { asCliOutputMode } from './asCliOutputMode';
import { renderCliOutput } from './renderCliOutput';
import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = register `rhx actor list` on the actor command group
 * .why = a caller discovers WHO is enrolled (the identities on disk) before it
 *   reaches a clone (usecase.5); an empty state names the get-started move so a
 *   first run is never a dead end
 */
export const invokeActorList = ({ actor }: { actor: Command }): void => {
  actor
    .command('list')
    .description('list the enrolled actors on disk')
    .option('--output <mode>', 'output mode: tree (default) or json', 'tree')
    .action(async (opts: { output?: string }) => {
      await withCliOutputErrors({
        outputRaw: opts.output,
        run: async () => {
          const mode = asCliOutputMode({ raw: opts.output });
          const repoPath = getOneRepoPath({ from: process.cwd() });
          const actors = getAllActorsOndisk({ repoPath });
          const linked = isRepoLinked({ repoPath });
          const view = asActorListView({ actors, linked });
          console.log(
            renderCliOutput({ mode, tree: view.tree, data: view.data }),
          );
        },
      });
    });
};
