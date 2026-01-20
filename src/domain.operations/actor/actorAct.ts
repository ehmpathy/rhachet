import type { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
import type { BrainOutput } from '@src/domain.objects/BrainOutput';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { Role } from '@src/domain.objects/Role';
import { asBrainOutput } from '@src/domain.operations/brain/asBrainOutput';
import { getRoleBriefs } from '@src/domain.operations/role/getRoleBriefs';

/**
 * .what = executes a rigid skill with a brain
 * .why = deterministic harness with probabilistic brain operations
 *
 * .note = skill is pre-resolved by genActor; this just executes
 * .note = TOutput generic enables type flow from genActor
 */
export const actorAct = async <TOutput>(input: {
  role: Role;
  brain: BrainRepl;
  skill: ActorRoleSkill<TOutput>;
  args: Record<string, unknown>;
}): Promise<BrainOutput<TOutput>> => {
  // resolve briefs from role
  const briefs = await getRoleBriefs({
    by: {
      role: { name: input.role.slug },
      briefs: { glob: '**/*' },
    },
  });

  // execute rigid skill with brain
  const result = await input.brain.act<TOutput>({
    role: { briefs },
    prompt: `Execute skill "${input.skill.slug}" with args: ${JSON.stringify(input.args)}`,
    schema: {
      output: input.skill.schema.output,
    },
  });

  // normalize for backwards compat with external brains
  return asBrainOutput(result);
};
