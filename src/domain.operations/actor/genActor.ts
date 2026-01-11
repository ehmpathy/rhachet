import { BadRequestError } from 'helpful-errors';

import type {
  ActorActOp,
  ActorAskOp,
  ActorBrain,
  ActorRunOp,
  SkillOutput,
} from '@src/domain.objects/Actor';
import { Actor } from '@src/domain.objects/Actor';
import type { Role } from '@src/domain.objects/Role';

import { actorAct } from './actorAct';
import { actorAsk } from './actorAsk';
import { actorRun } from './actorRun';
import { findActorBrainInAllowlist } from './findActorBrainInAllowlist';
import { findActorRoleSkillBySlug } from './findActorRoleSkillBySlug';

/**
 * .what = creates an actor from a role and brain allowlist
 * .why = composes role (skills + briefs) with brains for type-safe invocation
 *
 * .note =
 *   - first brain in allowlist is the default
 *   - .act() requires BrainRepl (validates at runtime)
 *   - .act() uses default brain when none specified
 *   - .act() validates brain against allowlist when specified
 *   - .run() executes solid skills without brain
 *   - .ask() works with both BrainRepl and BrainAtom
 */
export const genActor = <TRole extends Role>(input: {
  role: TRole;
  brains: ActorBrain[];
}): Actor<TRole> => {
  // validate that at least one brain is provided
  if (input.brains.length === 0)
    throw new BadRequestError(
      'genActor requires at least one brain in allowlist',
      { slugRole: input.role.slug },
    );

  // extract default brain (first in list)
  const defaultBrain = input.brains[0]!;

  // create bound .act() method with strong types
  const act: ActorActOp<TRole> = async (actInput) => {
    // resolve brain: use provided or default to first
    const brainResolved = actInput.brain
      ? findActorBrainInAllowlist({
          brain: actInput.brain,
          allowlist: input.brains,
        })
      : defaultBrain;

    // validate brain supports .act() (BrainRepl only, not BrainAtom)
    if (!('act' in brainResolved))
      throw new BadRequestError(
        'actor.act() requires a BrainRepl brain with .act() method',
        { brainSlug: brainResolved.slug },
      );

    // extract skill slug and args from skill object
    const entries = Object.entries(actInput.skill);
    if (entries.length !== 1)
      throw new BadRequestError('actor.act expects exactly one skill entry', {
        entriesCount: entries.length,
      });
    const [slugSkill, skillArgs] = entries[0]!;

    // resolve skill from role
    type TOutput = SkillOutput<
      NonNullable<TRole['skills']['rigid']>[typeof slugSkill]
    >;
    const skillResolved = findActorRoleSkillBySlug<TOutput>({
      slug: slugSkill,
      role: input.role,
      route: 'rigid',
    });

    // delegate to actorAct with pre-resolved skill
    return actorAct<TOutput>({
      role: input.role,
      brain: brainResolved,
      skill: skillResolved,
      args: skillArgs as Record<string, unknown>,
    });
  };

  // create bound .run() method with strong types
  const run: ActorRunOp<TRole> = async (runInput) => {
    // extract skill slug and args from skill object
    const entries = Object.entries(runInput.skill);
    if (entries.length !== 1)
      throw new BadRequestError('actor.run expects exactly one skill entry', {
        entriesCount: entries.length,
      });
    const [slugSkill, skillArgs] = entries[0]!;

    // resolve skill from role
    type TOutput = SkillOutput<
      NonNullable<TRole['skills']['solid']>[typeof slugSkill]
    >;
    const skillResolved = findActorRoleSkillBySlug<TOutput>({
      slug: slugSkill,
      role: input.role,
      route: 'solid',
    });

    // delegate to actorRun with pre-resolved skill
    return actorRun<TOutput>({
      skill: skillResolved,
      args: skillArgs as Record<string, unknown>,
    });
  };

  // create bound .ask() method with schema passthrough
  const ask: ActorAskOp = async (askInput) => {
    // delegate to actorAsk with default brain
    return actorAsk({
      role: input.role,
      brain: defaultBrain,
      prompt: askInput.prompt,
      schema: askInput.schema,
    });
  };

  // return actor with bound methods via Actor.typed() for strong type preservation
  return Actor.typed<TRole>({
    role: input.role,
    brains: input.brains,
    act,
    run,
    ask,
  });
};
