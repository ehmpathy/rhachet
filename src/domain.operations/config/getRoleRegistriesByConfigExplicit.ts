import type { RoleRegistry } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import { importEsmSafe } from '@src/infra/importEsmSafe/importEsmSafe';

/**
 * .what = get registries from explicit config (rhachet.use.ts)
 * .why = loads RoleRegistry[] from user-declared config file
 * .note = only used by JIT path (tsx); bun path reads from .agent/ directly
 */
export const getRoleRegistriesByConfigExplicit = async (input: {
  opts: InvokeOpts<{ config: string }>;
}): Promise<RoleRegistry[]> => {
  // .note = uses importEsmSafe, not a bare `await import()`. under module:commonjs, tsc
  //   down-levels a bare `await import()` to a require() shim identically here as at the
  //   package-load sites — and a user-authored rhachet.use.ts can import an esm-only brain/plugin
  //   graph, so the same #429 failure mode applies (who authored the entry file does not change
  //   it). importEsmSafe keeps the import esm-capable AND preserves fail-loud: a broken config
  //   still throws, it never warn+skips (that would be a failhide, rule.forbid.failhide).
  const config = await importEsmSafe<{
    getRoleRegistries: () => Promise<RoleRegistry[]>;
  }>({ specifier: input.opts.config });
  return await config.getRoleRegistries();
};
