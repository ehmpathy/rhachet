import type { BrainAtom } from '@src/domain.objects/BrainAtom';

import { genBrainAtom } from './atoms/genBrainAtom';

/**
 * .what = returns all brain atoms provided by xai
 * .why = enables consumers to register xai atoms with genContextBrain
 */
export const getBrainAtomsByXAI = (): BrainAtom[] => {
  return [genBrainAtom({ slug: 'xai/grok-code-fast-1' })];
};

export type { XAIAtomSlug } from './atoms/genBrainAtom';
// re-export factories for direct access
export { genBrainAtom } from './atoms/genBrainAtom';
