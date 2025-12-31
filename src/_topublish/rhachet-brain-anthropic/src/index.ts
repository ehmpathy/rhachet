import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { genBrainAtom } from './atoms/genBrainAtom';
import { genBrainRepl } from './repls/genBrainRepl';

/**
 * .what = returns all brain atoms provided by anthropic
 * .why = enables consumers to register anthropic atoms with genContextBrain
 */
export const getBrainAtomsByAnthropic = (): BrainAtom[] => {
  return [genBrainAtom({ slug: 'claude/opus' })];
};

/**
 * .what = returns all brain repls provided by anthropic
 * .why = enables consumers to register anthropic repls with genContextBrain
 */
export const getBrainReplsByAnthropic = (): BrainRepl[] => {
  return [genBrainRepl({ slug: 'claude/code' })];
};

// re-export factories for direct access
export { genBrainAtom } from './atoms/genBrainAtom';
export { genBrainRepl } from './repls/genBrainRepl';
