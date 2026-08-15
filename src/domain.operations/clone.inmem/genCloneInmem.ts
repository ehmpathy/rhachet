import { BadRequestError } from 'helpful-errors';

import type { ActorInmem } from '@src/domain.objects/ActorInmem';
import type {
  CloneActOp,
  CloneAskOp,
  CloneRunOp,
} from '@src/domain.objects/CloneInmem';
import { CloneInmem } from '@src/domain.objects/CloneInmem';
import type { Role } from '@src/domain.objects/Role';
import { actorAct } from '@src/domain.operations/actor/actorAct';
import { actorAsk } from '@src/domain.operations/actor/actorAsk';
import { actorRun } from '@src/domain.operations/actor/actorRun';
import { findActorBrainInAllowlist } from '@src/domain.operations/actor/findActorBrainInAllowlist';
import { findActorRoleSkillBySlug } from '@src/domain.operations/actor/findActorRoleSkillBySlug';

/**
 * .what = bakes an in-mem CLONE from an actor — a live embodiment engageable
 *   via .act()/.run()/.ask()
 * .why =
 *   - the actor (ActorInmem) is the recipe; the clone is what you engage
 *   - a clone looks up each skill slug across ALL of the actor's roles, so a
 *     .act()/.run() call reaches whichever role declares that slug
 *
 * .note = in-mem partition. the on-disk clone spawn is domain.operations/clone
 *   (a live process); this is the SDK's in-process engageable
 */
export const genCloneInmem = <TRoles extends Role[]>(input: {
  actor: ActorInmem<TRoles>;
}): CloneInmem<TRoles> => {
  const { roles, brains } = input.actor;

  // validate the actor carries an enrollable brain
  if (brains.length === 0)
    throw new BadRequestError(
      'genClone requires an actor with at least one brain',
      {
        slugsRoles: roles.map((role) => role.slug),
      },
    );

  // default brain is the first in the allowlist
  const defaultBrain = brains[0]!;

  // find which role declares a skill slug for a route, and derive that skill
  const findOneRoleSkill = <TOutput>(
    slug: string,
    route: 'solid' | 'rigid',
  ): {
    role: Role;
    skill: ReturnType<typeof findActorRoleSkillBySlug<TOutput>>;
  } => {
    // scan the roles for the first that declares this slug on this route
    const roleOwner = roles.find(
      (role) =>
        (route === 'solid' ? role.skills.solid : role.skills.rigid)?.[slug],
    );

    // fail fast if no role in the actor declares the slug
    if (!roleOwner)
      throw new BadRequestError(
        `skill not found across the actor's roles: ${slug}`,
        {
          slug,
          route,
          slugsRoles: roles.map((role) => role.slug),
        },
      );

    // derive the skill from the owning role
    return {
      role: roleOwner,
      skill: findActorRoleSkillBySlug<TOutput>({
        slug,
        role: roleOwner,
        route,
      }),
    };
  };

  // bind .act() — external types come from CloneActOp; the body derives at runtime
  const act: CloneActOp<TRoles> = async (actInput, context) => {
    // derive brain: use provided or default to first
    const brainDerived = actInput.brain
      ? findActorBrainInAllowlist({
          brain: actInput.brain,
          allowlist: brains,
        })
      : defaultBrain;

    // validate brain supports .act() (BrainRepl only, not BrainAtom)
    if (!('act' in brainDerived))
      throw new BadRequestError(
        'clone.act() requires a BrainRepl brain with .act() method',
        { brainSlug: brainDerived.slug },
      );

    // extract the single skill slug and its args
    const entries = Object.entries(actInput.skill);
    if (entries.length !== 1)
      throw new BadRequestError('clone.act expects exactly one skill entry', {
        entriesCount: entries.length,
      });
    const [slugSkill, skillArgs] = entries[0]!;

    // derive the skill from whichever role owns it, then execute
    const { role, skill } = findOneRoleSkill(slugSkill, 'rigid');
    // .note = boundary cast: the external CloneActOp annotation fixes the caller
    //   contract; the runtime slug is a plain string so the body is loosely typed
    return actorAct(
      {
        role,
        brain: brainDerived,
        skill,
        args: skillArgs as Record<string, unknown>,
      },
      context,
    ) as ReturnType<CloneActOp<TRoles>>;
  };

  // bind .run() — external types come from CloneRunOp
  const run: CloneRunOp<TRoles> = async (runInput) => {
    // extract the single skill slug and its args
    const entries = Object.entries(runInput.skill);
    if (entries.length !== 1)
      throw new BadRequestError('clone.run expects exactly one skill entry', {
        entriesCount: entries.length,
      });
    const [slugSkill, skillArgs] = entries[0]!;

    // derive the skill from whichever role owns it, then execute
    const { skill } = findOneRoleSkill(slugSkill, 'solid');
    // .note = boundary cast: external CloneRunOp fixes the caller contract
    return actorRun({
      skill,
      args: skillArgs as Record<string, unknown>,
    }) as ReturnType<CloneRunOp<TRoles>>;
  };

  // bind .ask() — fluid conversation with the default brain
  const ask: CloneAskOp = async (askInput, context) =>
    actorAsk(
      {
        // ask carries no skill, so the first role provides brief context
        role: roles[0]!,
        brain: defaultBrain,
        prompt: askInput.prompt,
        schema: askInput.schema,
      },
      context,
    );

  // return the engageable clone with bound methods
  return CloneInmem.typed<TRoles>({
    roles,
    brains,
    act,
    run,
    ask,
  });
};
