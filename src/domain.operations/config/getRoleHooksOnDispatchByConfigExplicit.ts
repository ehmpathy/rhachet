import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import type { RoleHooksOnDispatch } from '@src/domain.objects/RoleHooksOnDispatch';

/**
 * .what = get invoke hooks from explicit config (rhachet.use.ts)
 * .why = enables CLI commands to resolve hooks from user-declared config
 * .how =
 *   - lookup the config based on the options
 *   - grab the hooks from the config (supports array of RoleHooksOnDispatch)
 *   - merge hooks from all sources
 */
export const getRoleHooksOnDispatchByConfigExplicit = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<RoleHooksOnDispatch | null> => {
  // import the config
  const config: {
    getInvokeHooks?: () =>
      | Promise<RoleHooksOnDispatch | RoleHooksOnDispatch[]>
      | RoleHooksOnDispatch
      | RoleHooksOnDispatch[];
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
