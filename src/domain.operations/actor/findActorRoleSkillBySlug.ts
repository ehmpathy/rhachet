import { BadRequestError } from 'helpful-errors';

import { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
import type { Role } from '@src/domain.objects/Role';
import { discoverSkillExecutables } from '@src/domain.operations/invoke/discoverSkillExecutables';

/**
 * .what = finds a skill by slug for a role
 * .why = resolves skill from role.skills[route] or .agent/ dirs
 *
 * .note = role.skills[route] takes precedence over .agent/ dirs (usecase.8)
 */
export const findActorRoleSkillBySlug = (input: {
  slug: string;
  role: Role;
  route: 'solid' | 'rigid';
}): ActorRoleSkill => {
  // check role.skills[route] first (takes precedence per usecase.8)
  const skillsForRoute =
    input.route === 'solid' ? input.role.skills.solid : input.role.skills.rigid;

  // lookup schema from role.skills[route]
  const skillSchema = skillsForRoute?.[input.slug];

  if (skillSchema) {
    // find executable from .agent/ dirs (skill schema defines type, but executable runs)
    const executables = discoverSkillExecutables({
      slugRole: input.role.slug,
      slugSkill: input.slug,
    });

    // fail fast if skill is declared but no executable found
    if (executables.length === 0)
      throw new BadRequestError(
        `skill "${input.slug}" declared in role.skills.${input.route} but no executable found in .agent/`,
        {
          slugSkill: input.slug,
          slugRole: input.role.slug,
          route: input.route,
          hint: `create .agent/repo=.this/role=${input.role.slug}/skills/${input.slug}.sh`,
        },
      );

    return new ActorRoleSkill({
      slug: input.slug,
      route: input.route,
      source: 'role.skills',
      schema: skillSchema,
      executable: executables[0]!,
    });
  }

  // fall back to .agent/ discovery (executable exists but no schema)
  const executables = discoverSkillExecutables({
    slugRole: input.role.slug,
    slugSkill: input.slug,
  });

  // executable exists but no schema = not usable via actor contracts
  if (executables.length > 0)
    throw new BadRequestError(
      `skill "${input.slug}" found in .agent/ but lacks schema in role.skills.${input.route}`,
      {
        slugSkill: input.slug,
        slugRole: input.role.slug,
        route: input.route,
        hint: `add schema to role.skills.${input.route}.${input.slug} to use via actor contracts`,
        executable: executables[0],
      },
    );

  // skill not found
  throw new BadRequestError(`skill not found: ${input.slug}`, {
    slugSkill: input.slug,
    slugRole: input.role.slug,
    route: input.route,
    availableSolidSkills: input.role.skills.solid
      ? Object.keys(input.role.skills.solid)
      : [],
    availableRigidSkills: input.role.skills.rigid
      ? Object.keys(input.role.skills.rigid)
      : [],
  });
};
