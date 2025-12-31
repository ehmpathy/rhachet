import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainAtomPlugs } from '@src/domain.objects/BrainAtomPlugs';

/**
 * .what = invoke a brain atom for single-turn inference
 * .why = provides the core operation for atom-based imagination
 *   with automatic role brief embedding and schema enforcement
 */
export const askViaBrainAtom = async <TOutput>(
  input: {
    atom: BrainAtom;
    plugs?: BrainAtomPlugs;
    role: { briefs?: Artifact<typeof GitFile>[] };
    prompt: string;
    schema: { output: z.Schema<TOutput> };
  },
  context?: Empty,
): Promise<TOutput> => {
  // delegate to the atom's ask implementation
  return input.atom.ask(
    {
      plugs: input.plugs,
      role: input.role,
      prompt: input.prompt,
      schema: input.schema,
    },
    context,
  );
};
