import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainOutput } from '@src/domain.objects/BrainOutput';
import type { BrainPlugs } from '@src/domain.objects/BrainPlugs';

/**
 * .what = invoke a brain atom for single-turn inference
 * .why = provides the core operation for atom-based imagination
 *   with automatic role brief embed and schema enforcement
 *
 * .note = TPlugs enables progressive complexity: no tools → no null checks
 */
export const askViaBrainAtom = async <
  TOutput,
  TPlugs extends BrainPlugs = BrainPlugs,
>(
  input: {
    atom: BrainAtom;
    plugs?: TPlugs;
    role: { briefs?: Artifact<typeof GitFile>[] };
    prompt: string;
    schema: { output: z.Schema<TOutput> };
  },
  context?: Empty,
): Promise<BrainOutput<TOutput, 'atom', TPlugs>> => {
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
