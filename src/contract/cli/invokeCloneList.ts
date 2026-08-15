import type { Command } from 'commander';

import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { isRepoLinked } from '@src/domain.operations/actor/enrolled/isRepoLinked';
import { asActorRef } from '@src/domain.operations/clone/asActorRef';
import {
  asCloneListView,
  type CloneListGroup,
} from '@src/domain.operations/clone/cli/asCloneListView';
import { getAllClonesForActor } from '@src/domain.operations/clone/getAllClonesForActor';
import { getAllClonesGroupedByActor } from '@src/domain.operations/clone/getAllClonesGroupedByActor';
import { getCloneReachState } from '@src/domain.operations/clone/getCloneReachState';
import { getOneActorOndiskByRef } from '@src/domain.operations/clone/getOneActorOndiskByRef';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { asCliOutputMode } from './asCliOutputMode';
import { renderCliOutput } from './renderCliOutput';
import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = enrich one actor's clones with their live reach-state for the list view
 * .why = reach-state is an impure socket probe; this gathers it per clone so the
 *   pure asCloneListView renders tree + json from settled facts
 */
const asListGroup = async (input: {
  actor: ActorOndisk;
  clones: CloneOndisk[];
}): Promise<CloneListGroup> => {
  const clones = await Promise.all(
    input.clones.map(async (clone) => ({
      serial: clone.serial,
      slug: clone.slug,
      reachState: await getCloneReachState({ clone }),
      spawnedAt: clone.spawnedAt,
    })),
  );
  return {
    hash: input.actor.hash,
    brain: input.actor.brain,
    roles: input.actor.roles,
    clones,
  };
};

/**
 * .what = gather the list groups — one actor's clones when a `@<hash-prefix>` is
 *   given, else every actor's, each reach-enriched into a `CloneListGroup`
 * .why = the single-actor scope and the all-actors scope are two distinct paths;
 *   an early return keeps each a straight-line narrative (no ternary-with-side-
 *   effects or inline IIFE at the call site — rule.require.narrative-flow)
 */
const getCloneListGroups = async (input: {
  repoPath: string;
  actor: string | undefined;
}): Promise<CloneListGroup[]> => {
  // scope to ONE actor when a `@<hash-prefix>` is given
  if (input.actor !== undefined) {
    const found = getOneActorOndiskByRef({
      repoPath: input.repoPath,
      ref: asActorRef({ raw: input.actor }),
    });
    const clones = getAllClonesForActor({
      actorDir: getActorOndiskDir({
        repoPath: found.repoPath,
        hash: found.hash,
      }),
      actorsRoot: getActorsRootDir({ repoPath: found.repoPath }),
      repoPath: found.repoPath,
      actorHash: found.hash,
    });
    return [await asListGroup({ actor: found, clones })];
  }

  // else every actor, grouped
  return Promise.all(
    getAllClonesGroupedByActor({ repoPath: input.repoPath }).map((group) =>
      asListGroup(group),
    ),
  );
};

/**
 * .what = register `rhx clone list [@<actor>]` on the clone command group
 * .why = a caller (human OR cron/comms) discovers which clones are reachable — all
 *   of them, or scoped to one actor by a git-style hash prefix (usecase.5 + .11)
 *
 * .note = `--output json` emits the same grouped facts as machine fields, so a
 *   consumer reads state off a field, never off a box-glyph
 */
export const invokeCloneList = ({ clone }: { clone: Command }): void => {
  clone
    .command('list [actor]')
    .description('list clones (all, or scoped to one actor by @<hash-prefix>)')
    .option('--output <mode>', 'output mode: tree (default) or json', 'tree')
    .action(async (actor: string | undefined, opts: { output?: string }) => {
      await withCliOutputErrors({
        outputRaw: opts.output,
        run: async () => {
          const mode = asCliOutputMode({ raw: opts.output });
          const repoPath = getOneRepoPath({ from: process.cwd() });

          const groups = await getCloneListGroups({ repoPath, actor });

          const linked = isRepoLinked({ repoPath });
          // scoped = a `@<actor>` was named — keep that one actor even if clone-less;
          // unscoped hides clone-less actors (they live in `rhx actor list`)
          const view = asCloneListView({
            groups,
            linked,
            scoped: actor !== undefined,
          });
          console.log(
            renderCliOutput({ mode, tree: view.tree, data: view.data }),
          );
        },
      });
    });
};
