import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { brainAtomClaudeOpus } from './atoms/brainAtomClaudeOpus';
import { brainReplClaudeCode } from './repls/brainReplClaudeCode';

/**
 * .what = returns all brain atoms provided by anthropic
 * .why = enables consumers to register anthropic atoms with genContextBrain
 */
export const getBrainAtomsByAnthropic = (): BrainAtom[] => {
  return [brainAtomClaudeOpus];
};

/**
 * .what = returns all brain repls provided by anthropic
 * .why = enables consumers to register anthropic repls with genContextBrain
 */
export const getBrainReplsByAnthropic = (): BrainRepl[] => {
  return [brainReplClaudeCode];
};

// re-export individual brains for direct access
export { brainAtomClaudeOpus } from './atoms/brainAtomClaudeOpus';
export { brainReplClaudeCode } from './repls/brainReplClaudeCode';
