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
  },
  context: ContextKeyrack,
): Promise<{ effect: 'deleted' | 'not_found' }> => {
  return delKeyrackKeyHost(input, context);
};
