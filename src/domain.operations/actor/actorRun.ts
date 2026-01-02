import type { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
import { executeSkill } from '@src/domain.operations/invoke/executeSkill';

/**
 * .what = executes a solid skill via spawn
 * .why = deterministic shell execution, no brain
 *
 * .note = skill is pre-resolved by genActor; this just executes
 */
export const actorRun = async (input: {
  skill: ActorRoleSkill;
  args: Record<string, unknown>;
}): Promise<unknown> => {
  // convert skill args object to CLI args array
  const argsArray: string[] = [];
  for (const [key, value] of Object.entries(input.args)) {
    argsArray.push(`--${key}`, String(value));
  }

  // execute skill via spawn (capture mode for SDK return value)
  const result = await executeSkill({
    skill: input.skill.executable,
    args: argsArray,
    stream: false,
  });

  return result;
};
