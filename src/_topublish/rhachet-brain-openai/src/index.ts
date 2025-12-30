import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { brainAtomGpt4o } from './atoms/brainAtomGpt4o';
import { brainReplCodex } from './repls/brainReplCodex';

/**
 * .what = returns all brain atoms provided by openai
 * .why = enables consumers to register openai atoms with genContextBrain
 */
export const getBrainAtomsByOpenAI = (): BrainAtom[] => {
  return [brainAtomGpt4o];
};

/**
 * .what = returns all brain repls provided by openai
 * .why = enables consumers to register openai repls with genContextBrain
 */
export const getBrainReplsByOpenAI = (): BrainRepl[] => {
  return [brainReplCodex];
};

// re-export individual brains for direct access
export { brainAtomGpt4o } from './atoms/brainAtomGpt4o';
export { brainReplCodex } from './repls/brainReplCodex';
