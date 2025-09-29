import { InvokeHooks } from '../../domain/objects/InvokeHooks';
import { InvokeOpts } from '../../domain/objects/InvokeOpts';

/**
 * .what = get invoke hooks from the invocation options declared
 * .how =
 *   - lookup the config based on the options
 *   - grab the hooks from the config
 */
export const getInvokeHooksByOpts = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<InvokeHooks | null> => {
  // import the config
  const config: { getInvokeHooks?: () => Promise<InvokeHooks> } = await import(
    input.opts.config
  );

  // grab the registries
  return (await config.getInvokeHooks?.()) ?? null;
};
