import type { BrainHooksAdapter } from '../../../../domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '../../../../domain.objects/BrainSpecifier';
import { genBrainHooksAdapterForClaudeCode } from './genBrainHooksAdapterForClaudeCode';

/**
 * .what = returns brain hooks adapter for specified brain
 * .why = supplier contract for rhachet to discover adapters
 *
 * .note = currently only supports claude-code brain
 */
export const getBrainHooks = (input: {
  brain: BrainSpecifier;
  repoPath: string;
}): BrainHooksAdapter | null => {
  const { brain, repoPath } = input;

  // check if this supplier supports the requested brain
  if (brain === 'claude-code' || brain === 'anthropic/claude/code') {
    return genBrainHooksAdapterForClaudeCode({ repoPath });
  }

  // this supplier does not support the requested brain
  return null;
};
