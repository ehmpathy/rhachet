import { z } from 'zod';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { Role } from '@src/domain.objects/Role';
import { getRoleBriefs } from '@src/domain.operations/role/getRoleBriefs';

/**
 * .what = starts a fluid conversation with a brain
 * .why = open-ended exploration, brain decides path
 *
 * todo: support --interactive mode for cli invocations
 */
export const actorAsk = async (input: {
  role: Role;
  brain: BrainRepl;
  prompt: string;
}): Promise<{ response: string }> => {
  // resolve briefs from role
  const briefs = await getRoleBriefs({
    by: {
      role: { name: input.role.slug },
      briefs: { glob: '**/*' },
    },
  });

  // execute fluid conversation with brain
  // note: openai requires object schema, so wrap response in object
  const result = await input.brain.ask({
    role: { briefs },
    prompt: input.prompt,
    schema: {
      output: z.object({ response: z.string() }),
    },
  });

  return result;
};
