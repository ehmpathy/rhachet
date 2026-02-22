import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';

import { genBrainHooksAdapterForOpencode } from './genBrainHooksAdapterForOpencode';

/**
 * .what = returns brain hooks adapter for specified brain
 * .why = supplier contract for rhachet to discover adapters
 *
 * .note = supports opencode brain
 */
export const getBrainHooks = (input: {
  brain: BrainSpecifier;
  repoPath: string;
}): BrainHooksAdapter | null => {
  const { brain, repoPath } = input;

  // check if this supplier supports the requested brain
  if (brain === 'opencode' || brain === 'anomaly/opencode') {
    return genBrainHooksAdapterForOpencode({ repoPath });
  }

  // this supplier does not support the requested brain
  return null;
};
