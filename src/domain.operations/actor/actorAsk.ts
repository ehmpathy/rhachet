import { z } from 'zod';

import type { ActorBrain } from '@src/domain.objects/Actor';
import type { BrainOutput } from '@src/domain.objects/BrainOutput';
import type { Role } from '@src/domain.objects/Role';
import { asBrainOutput } from '@src/domain.operations/brain/asBrainOutput';
import { getRoleBriefs } from '@src/domain.operations/role/getRoleBriefs';

/**
 * .what = default schema for actor.ask
 * .why = enables simple { answer: string } responses without custom schema
 */
export const ACTOR_ASK_DEFAULT_SCHEMA = {
  output: z.object({ answer: z.string() }),
};

/**
 * .what = starts a fluid conversation with a brain
 * .why = open-ended exploration, brain decides path
 *
 * .note = accepts both BrainRepl and BrainAtom since both support .ask()
 * .note = use ACTOR_ASK_DEFAULT_SCHEMA when no custom schema needed
 *
 * todo: support --interactive mode for cli invocations
 */
export const actorAsk = async <TOutput>(input: {
  role: Role;
  brain: ActorBrain;
  prompt: string;
  schema: { output: z.Schema<TOutput> };
}): Promise<BrainOutput<TOutput>> => {
  // resolve briefs from role
  const briefs = await getRoleBriefs({
    by: {
      role: { name: input.role.slug },
      briefs: { glob: '**/*' },
    },
  });

  // execute fluid conversation with brain
  const result = await input.brain.ask({
    role: { briefs },
    prompt: input.prompt,
    schema: input.schema,
  });

  // normalize for backwards compat with external brains
  return asBrainOutput(result);
};
