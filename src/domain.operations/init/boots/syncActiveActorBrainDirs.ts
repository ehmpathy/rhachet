import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { isActorActive } from '@src/domain.operations/actor/enrolled/isActorActive';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';
import { setBrainDirBoot } from '@src/domain.operations/boot/setBrainDirBoot';

import { asBrainDirSyncResult } from './asBrainDirSyncResult';
import { asRoleRefsForEnrolledSlugs } from './asRoleRefsForEnrolledSlugs';

/**
 * .what = re-render the brain dir of each active hash actor, each from its own roleset
 * .why = a live clone re-reads its actor's `boot.md`, so a role package bump must reach
 *        it; an actor with no clone still live is skipped, and its next spawn renders
 *        fresh before it boots
 *
 * .note = one actor that fails is collected, and the rest still render
 * .note = the enumeration reads `actor.via.hash=*` alone; a slug or derived actor dir
 *         is not visited, and the default actor is `syncDefaultBrainDir`'s
 */
export const syncActiveActorBrainDirs = async (input: {
  repoPath: string;
  refsLinked: RoleLinkRef[];
}): Promise<{
  renders: BrainDirBootRender[];
  failures: BrainDirBootFailure[];
}> => {
  // enumerate the hash actors; an unreadable manifest fails the whole enumeration
  const enumeration = getAllActorsOrFailure({ repoPath: input.repoPath });
  if ('failure' in enumeration)
    return { renders: [], failures: [enumeration.failure] };

  // render each active actor; a throw is collected under that actor's scope
  const outcomes = await Promise.all(
    enumeration.actors.map((actor) =>
      setActiveActorBrainDirBoot({ actor, refsLinked: input.refsLinked }).then(
        (render) => ({ render, failure: null }),
        (error: unknown) => ({
          render: null,
          failure: {
            scope: { kind: 'actor', actorHash: actor.hash },
            cause: asError(error),
          } satisfies BrainDirBootFailure,
        }),
      ),
    ),
  );

  // split the outcomes into renders and failures
  return asBrainDirSyncResult({ outcomes });
};

/**
 * .what = the hash actors on disk, or the one failure that stopped the read
 * .why = an unreadable manifest is a sync failure to report, never a throw
 */
const getAllActorsOrFailure = (input: {
  repoPath: string;
}): { actors: ActorOndisk[] } | { failure: BrainDirBootFailure } => {
  try {
    return { actors: getAllActorsOndisk({ repoPath: input.repoPath }) };
  } catch (error) {
    return { failure: { scope: { kind: 'actors' }, cause: asError(error) } };
  }
};

/**
 * .what = render one actor's brain dir if the actor is active, else skip it
 * .why = keeps the sweep loop a narrative of collect-or-continue
 */
const setActiveActorBrainDirBoot = async (input: {
  actor: ActorOndisk;
  refsLinked: RoleLinkRef[];
}): Promise<BrainDirBootRender | null> => {
  // an actor with no clone still live reads naught; skip it
  if (!(await isActorActive({ actor: input.actor }))) return null;

  // render from the actor's own roleset, never the repo's linked set
  const refs = asRoleRefsForEnrolledSlugs({
    actorHash: input.actor.hash,
    slugs: input.actor.roles,
    refsLinked: input.refsLinked,
  });
  return setBrainDirBoot({
    brainDir: getBrainOndiskDir({
      actorDir: getActorOndiskDir({
        repoPath: input.actor.repoPath,
        hash: input.actor.hash,
      }),
    }),
    roles: refs,
    repoPath: input.actor.repoPath,
    scope: { kind: 'actor', actorHash: input.actor.hash },
  });
};

/**
 * .what = a thrown value as an Error
 * .why = a failure record carries an Error; a non-Error throw is wrapped, never lost
 */
const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));
