import type { BrainRepl } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import { importEsmSafe } from '@src/infra/importEsmSafe/importEsmSafe';

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
  // import the config via the esm-safe indirection
  // .note = uses importEsmSafe, not a bare `await import()`. under module:commonjs, tsc
  //   down-levels a bare `await import()` to a require() shim identically here as at the
  //   package-load sites — and a user-authored rhachet.use.ts can import an esm-only brain/plugin
  //   graph, so the same #429 failure mode applies (who authored the entry file does not change
  //   it). importEsmSafe keeps the import esm-capable AND preserves fail-loud: a broken config
  //   still throws, it never warn+skips (that would be a failhide, rule.forbid.failhide).
  const config = await importEsmSafe<{
    getBrainRepls?: () => Promise<BrainRepl[]>;
  }>({ specifier: input.opts.config });

  // grab the brain repls if available
  if (!config.getBrainRepls) return [];

  return await config.getBrainRepls();
};
