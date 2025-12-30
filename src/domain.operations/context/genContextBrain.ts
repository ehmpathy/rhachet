import { BadRequestError } from 'helpful-errors';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { ContextBrain } from '@src/domain.objects/ContextBrain';

import { findBrainAtomByRef } from './findBrainAtomByRef';
import { findBrainReplByRef } from './findBrainReplByRef';

/**
 * .what = factory to create a brain context from plugin-provided atoms and repls
 * .why =
 *   - provides a clean entry point for context creation
 *   - validates no duplicate { repo, slug } identifiers
 *   - composes the context with lookup and delegation logic
 */
export const genContextBrain = (input: {
  atoms?: BrainAtom[];
  repls?: BrainRepl[];
}): ContextBrain => {
  // default to empty arrays
  const atoms = input.atoms ?? [];
  const repls = input.repls ?? [];

  // validate no duplicate atoms
  const atomKeys = atoms.map((a) => `${a.repo}:${a.slug}`);
  const duplicateAtom = atomKeys.find((k, i) => atomKeys.indexOf(k) !== i);
  if (duplicateAtom)
    throw new BadRequestError('duplicate atom identifier', { duplicateAtom });

  // validate no duplicate repls
  const replKeys = repls.map((r) => `${r.repo}:${r.slug}`);
  const duplicateRepl = replKeys.find((k, i) => replKeys.indexOf(k) !== i);
  if (duplicateRepl)
    throw new BadRequestError('duplicate repl identifier', { duplicateRepl });

  // return context with lookup and delegation
  return {
    brain: {
      atom: {
        imagine: async (imagineInput) => {
          const atom = findBrainAtomByRef({ atoms, ref: imagineInput.brain });
          return atom.imagine(imagineInput, {}) as any;
        },
      },
      repl: {
        imagine: async (imagineInput) => {
          const repl = findBrainReplByRef({ repls, ref: imagineInput.brain });
          return repl.imagine(imagineInput, {}) as any;
        },
      },
    },
  };
};
