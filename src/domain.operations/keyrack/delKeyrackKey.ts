import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';

import { delKeyrackKeyHost } from './delKeyrackKeyHost';
import type { ContextKeyrack } from './genContextKeyrack';

/**
 * .what = orchestrates the full keyrack del flow
 * .why = single domain operation for CLI to call (layer separation)
 *
 * .note = removes key from vault, host manifest, and keyrack.yml
 */
export const delKeyrackKey = async (
  input: {
    slug: string;

    /**
     * .what = the reach of the key to remove; absent means the reachless key
     * .why = a del names one address, exactly as a set does. absent this passthrough, a key
     *        cut only for a reach could never be removed at all
     */
    reach?: KeyrackKeyReach;
  },
  context: ContextKeyrack,
): Promise<{
  effect: 'deleted' | 'not_found';
  // the remote secret keyrack destroyed, if the vault owned one (threaded up for CLI feedback)
  destroyed?: { exid: string } | null;
}> => {
  return delKeyrackKeyHost(input, context);
};
