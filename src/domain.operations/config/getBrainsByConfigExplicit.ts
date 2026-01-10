import type { BrainRepl } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';

/**
 * .what = get brain repls from explicit config (rhachet.use.ts)
 * .why = enables CLI commands to resolve brains from user-declared config
 * .how =
 *   - lookup the config based on the options
 *   - grab the brain repls from the config
 */
export const getBrainsByConfigExplicit = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<BrainRepl[]> => {
  // import the config
  const config: { getBrainRepls?: () => Promise<BrainRepl[]> } = await import(
    input.opts.config
  );

  // grab the brain repls if available
  if (!config.getBrainRepls) return [];

  return await config.getBrainRepls();
};
