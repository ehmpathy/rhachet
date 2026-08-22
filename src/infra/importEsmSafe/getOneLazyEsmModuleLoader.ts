import { MalfunctionError } from 'helpful-errors';

import {
  getOneEsmLoadFailureHint,
  importEsmOrRequire,
} from './importEsmOrRequire';

/**
 * .what = build a memoized, fail-loud loader for a single pure-esm module (a getOne$Module fn)
 * .why = rhachet's own prod code must load a pure-esm dep LAZILY (not an eager static import that
 *        tsc down-levels to a require() in dist — rule.forbid.eager-esm-imports-in-prod,
 *        ehmpathy/rhachet#468). every such site needs the SAME three guarantees, so they live here
 *        once rather than copy-pasted per adapter (rule of three — age-encryption + @octokit/auth-app
 *        are the two callers):
 *          1. lazy — the load fires on first call, never at module-eval.
 *          2. memoized + single-flight — the in-flight promise is cached, so concurrent first
 *             callers share ONE load; a resolved module is returned on every later call.
 *          3. fail loud + actionable — a load failure throws a MalfunctionError that names the
 *             module AND the runtime-aware fix (rule.require.failloud /
 *             rule.require.errors-name-the-fix). the failed promise is NOT cached, so a later call
 *             re-attempts the load (a transient breakage does not poison the process forever).
 * .note = the message composes to `failed to load the <specifier> module for <purpose>` — the
 *         `purpose` gives the human the domain context (e.g. 'keyrack crypto', 'github app auth').
 * .note = the real-node (prod) load-path is proven by a real-node acceptance clamp
 *         (keyrackEsmRequire.realnode.acceptance.test.ts); the fail-loud path by a jest unit clamp
 *         (getOneLazyEsmModuleLoader.test.ts) — jest cannot import() a pure-esm package, so it is
 *         the natural home for the load-failure branch.
 * .note = `load` is an OPTIONAL injected loader (dependency injection); it defaults to the real
 *         runtime-aware `importEsmOrRequire`. prod callers omit it; the unit clamp injects a fake
 *         loader to exercise the memoize + fail-loud guarantees WITHOUT a `jest.mock`
 *         (rule.forbid.unit.remote-boundaries — inject a fake, never mock).
 */
export const getOneLazyEsmModuleLoader = <TModule>(input: {
  specifier: string;
  purpose: string;
  load?: (input: { specifier: string }) => Promise<TModule>;
}): (() => Promise<TModule>) => {
  const load: (input: { specifier: string }) => Promise<TModule> =
    input.load ?? importEsmOrRequire;
  let cached: Promise<TModule> | undefined;
  return (): Promise<TModule> => {
    if (!cached)
      cached = load({
        specifier: input.specifier,
      }).catch((error) => {
        // a failed load must not be cached — clear it so a later call re-attempts (fail loud,
        // then allow recovery), rather than a poisoned rejected promise on every future call
        cached = undefined;
        throw new MalfunctionError(
          `failed to load the ${input.specifier} module for ${input.purpose}`,
          {
            hint: getOneEsmLoadFailureHint({ specifier: input.specifier }),
            reason: error instanceof Error ? error.message : String(error),
          },
        );
      });
    return cached;
  };
};
