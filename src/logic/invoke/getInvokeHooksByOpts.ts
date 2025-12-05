import type { InvokeHooks } from '../../domain/objects/InvokeHooks';
import type { InvokeOpts } from '../../domain/objects/InvokeOpts';

/**
 * .what = get invoke hooks from the invocation options declared
 * .how =
 *   - lookup the config based on the options
 *   - grab the hooks from the config (supports array of InvokeHooks)
 *   - merge hooks from all sources
 */
export const getInvokeHooksByOpts = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<InvokeHooks | null> => {
  // import the config
  const config: {
    getInvokeHooks?: () =>
      | Promise<InvokeHooks | InvokeHooks[]>
      | InvokeHooks
      | InvokeHooks[];
  } = await import(input.opts.config);

  // grab the hooks (may be single or array)
  const hooksResult = await config.getInvokeHooks?.();
  if (!hooksResult) return null;

  // normalize to array and merge
  const hooksList = Array.isArray(hooksResult) ? hooksResult : [hooksResult];
  return {
    onInvokeAskInput: hooksList.flatMap((h) => h?.onInvokeAskInput ?? []),
  };
};
