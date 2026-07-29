import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import type { RoleHooksOnDispatch } from '@src/domain.objects/RoleHooksOnDispatch';
import { importEsmSafe } from '@src/infra/importEsmSafe/importEsmSafe';

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
  // import the config via the esm-safe indirection
  // .note = uses importEsmSafe, not a bare `await import()`. under module:commonjs, tsc
  //   down-levels a bare `await import()` to a require() shim identically here as at the
  //   package-load sites — and a user-authored rhachet.use.ts can import an esm-only brain/plugin
  //   graph, so the same #429 failure mode applies (who authored the entry file does not change
  //   it). importEsmSafe keeps the import esm-capable AND preserves fail-loud: a broken config
  //   still throws, it never warn+skips (that would be a failhide, rule.forbid.failhide).
  const config = await importEsmSafe<{
    getInvokeHooks?: () =>
      | Promise<RoleHooksOnDispatch | RoleHooksOnDispatch[]>
      | RoleHooksOnDispatch
      | RoleHooksOnDispatch[];
  }>({ specifier: input.opts.config });

  // grab the hooks (may be single or array)
  const hooksResult = await config.getInvokeHooks?.();
  if (!hooksResult) return null;

  // normalize to array and merge
  const hooksList = Array.isArray(hooksResult) ? hooksResult : [hooksResult];
  return {
    onInvokeAskInput: hooksList.flatMap((h) => h?.onInvokeAskInput ?? []),
  };
};
