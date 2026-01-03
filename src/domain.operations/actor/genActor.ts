import { BadRequestError } from 'helpful-errors';

import type { ActorActOp, ActorRunOp } from '@src/domain.objects/Actor';
import { Actor } from '@src/domain.objects/Actor';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
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
 *   - .act() uses default brain when none specified
 *   - .act() validates brain against allowlist when specified
 *   - .run() executes solid skills without brain
 *   - .ask() starts fluid conversation with default brain
 */
export const genActor = <TRole extends Role>(input: {
  role: TRole;
  brains: BrainRepl[];
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

    // extract skill slug and args from skill object
    const entries = Object.entries(actInput.skill);
    if (entries.length !== 1)
      throw new BadRequestError('actor.act expects exactly one skill entry', {
        entriesCount: entries.length,
      });
    const [slugSkill, skillArgs] = entries[0]!;

    // resolve skill from role
    const skillResolved = findActorRoleSkillBySlug({
      slug: slugSkill,
      role: input.role,
      route: 'rigid',
    });

    // delegate to actorAct with pre-resolved skill
    return actorAct({
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
    const skillResolved = findActorRoleSkillBySlug({
      slug: slugSkill,
      role: input.role,
      route: 'solid',
    });

    // delegate to actorRun with pre-resolved skill
    return actorRun({
      skill: skillResolved,
      args: skillArgs as Record<string, unknown>,
    });
  };

  // create bound .ask() method
  const ask = async (askInput: {
    prompt: string;
  }): Promise<{ response: string }> => {
    // delegate to actorAsk with default brain
    return actorAsk({
      role: input.role,
      brain: defaultBrain,
      prompt: askInput.prompt,
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
