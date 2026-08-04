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
): Promise<{
  effect: 'deleted' | 'not_found';
  // the remote secret keyrack destroyed, if the vault owned one (threaded up for CLI feedback)
  destroyed?: { exid: string } | null;
}> => {
  return delKeyrackKeyHost(input, context);
};
