import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { genBrainAtom } from './atoms/genBrainAtom';
import { genBrainRepl } from './repls/genBrainRepl';

/**
 * .what = returns all brain atoms provided by openai
 * .why = enables consumers to register openai atoms with genContextBrain
 */
export const getBrainAtomsByOpenAI = (): BrainAtom[] => {
  return [genBrainAtom({ slug: 'openai/gpt-4o' })];
};

/**
 * .what = returns all brain repls provided by openai
 * .why = enables consumers to register openai repls with genContextBrain
 */
export const getBrainReplsByOpenAI = (): BrainRepl[] => {
  return [genBrainRepl({ slug: 'openai/codex' })];
};

// re-export factories for direct access
export { genBrainAtom } from './atoms/genBrainAtom';
export { genBrainRepl } from './repls/genBrainRepl';
