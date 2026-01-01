import type { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { Role } from '@src/domain.objects/Role';
import { getRoleBriefs } from '@src/domain.operations/role/getRoleBriefs';

/**
 * .what = executes a rigid skill with a brain
 * .why = deterministic harness with probabilistic brain operations
 *
 * .note = skill is pre-resolved by genActor; this just executes
 */
export const actorAct = async (input: {
  role: Role;
  brain: BrainRepl;
  skill: ActorRoleSkill;
  args: Record<string, unknown>;
}): Promise<unknown> => {
  // resolve briefs from role
  const briefs = await getRoleBriefs({
    by: {
      role: { name: input.role.slug },
      briefs: { glob: '**/*' },
    },
  });

  // execute rigid skill with brain
  const result = await input.brain.act({
    role: { briefs },
    prompt: `Execute skill "${input.skill.slug}" with args: ${JSON.stringify(input.args)}`,
    schema: {
      output: input.skill.schema?.output ?? ({} as any),
    },
  });

  return result;
};
