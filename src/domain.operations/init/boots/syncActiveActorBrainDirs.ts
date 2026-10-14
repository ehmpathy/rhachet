import { MalfunctionError } from 'helpful-errors';

import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { REPO_ACTOR_EXID } from '@src/domain.operations/actor/enrolled/constants';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';
import { setBrainDirBoot } from '@src/domain.operations/boot/setBrainDirBoot';
import { getOneIsActorActive } from '@src/domain.operations/clone/getOneIsActorActive';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import { asBrainDirSyncResult } from './asBrainDirSyncResult';
import { asRoleRefsForEnrolledSlugs } from './asRoleRefsForEnrolledSlugs';

/**
 * .what = re-render the brain dir of each active hash actor, each from its own roleset
 * .why = a live clone re-reads its actor's `boot.md`, so a role package bump must reach
 *        it; an actor with no clone still live is skipped, and its next spawn renders
 *        fresh before it boots
 *
 * .note = one actor that fails is collected, and the rest still render
 * .note = the sweep visits the hash actors alone: the enumeration admits `repo=` and `hash=`
 *         dirs (`asActorOndiskExidFromDirName`), and the repo actor is `setRepoActorBrainDir`'s
 *         to render, from the linked set rather than its first enroll's roles
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
      getOneActorBrainDirBootOutcome({ actor, refsLinked: input.refsLinked }),
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
    const actors = getAllActorsOndisk({ repoPath: input.repoPath });
    return { actors: actors.filter((actor) => actor.exid !== REPO_ACTOR_EXID) };
  } catch (error) {
    return {
      failure: {
        scope: { kind: 'actors' },
        cause: asErrorCollectedOrThrow({ error }),
      },
    };
  }
};

/**
 * .what = one actor's render, or its failure under its own scope
 * .why = one broken actor must never skip the rest of the sweep
 * .note = a code defect is the one fault that is rethrown, not collected
 */
const getOneActorBrainDirBootOutcome = (input: {
  actor: ActorOndisk;
  refsLinked: RoleLinkRef[];
}): Promise<{
  render: BrainDirBootRender | null;
  failure: BrainDirBootFailure | null;
}> =>
  setActiveActorBrainDirBoot(input).then(
    (render) => ({ render, failure: null }),
    (error: unknown) => ({
      render: null,
      failure: {
        scope: { kind: 'actor', actorExid: input.actor.exid },
        cause: asErrorCollectedOrThrow({ error }),
      },
    }),
  );

/**
 * .what = render one actor's brain dir if the actor is active, else skip it
 * .why = keeps the sweep loop a narrative of collect-or-continue
 */
const setActiveActorBrainDirBoot = async (input: {
  actor: ActorOndisk;
  refsLinked: RoleLinkRef[];
}): Promise<BrainDirBootRender | null> => {
  // an actor with no clone still live reads naught; skip it
  if (!(await getOneIsActorActive({ actor: input.actor }))) return null;

  // render from the actor's own roleset, never the repo's linked set
  const refs = asRoleRefsForEnrolledSlugs({
    actorExid: input.actor.exid,
    slugs: input.actor.roles,
    refsLinked: input.refsLinked,
  });
  return setBrainDirBoot({
    brainDir: getBrainOndiskDir({
      actorDir: getActorOndiskDir({
        repoPath: input.actor.repoPath,
        exid: input.actor.exid,
      }),
    }),
    roles: refs,
    repoPath: input.actor.repoPath,
    scope: { kind: 'actor', actorExid: input.actor.exid },
  });
};

/**
 * .what = a thrown value as the Error a failure record collects — or a rethrow, for a defect
 * .why = the collectors above hold an allowlist: a classed or fs fault is one actor's row, and
 *        the sweep goes on; a code defect (`isCodeDefectError`) is rethrown, never folded into a
 *        row (`rule.forbid.failhide`). a non-Error throw is wrapped in a MalfunctionError, so the
 *        failure line still names a class and the value
 */
const asErrorCollectedOrThrow = (input: { error: unknown }): Error => {
  if (isCodeDefectError({ error: input.error })) throw input.error;
  if (input.error instanceof Error) return input.error;
  return new MalfunctionError('actor brain dir sync threw a non-Error value', {
    reason: input.error,
    hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
  });
};
