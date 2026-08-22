import { getOneLazyEsmModuleLoader } from '@src/infra/importEsmSafe/getOneLazyEsmModuleLoader';

/**
 * .what = one shared lazy, memoized, fail-loud loader for the pure-esm `@scure/base` module
 * .why = both sshPubkeyToAgeRecipient and sshPrikeyToAgeIdentity need `@scure/base` (bech32) for
 *        the age-key encode. a per-file loader would hold two separate single-flight caches for the
 *        identical package, so the "concurrent first callers share ONE load" guarantee of
 *        getOneLazyEsmModuleLoader would hold within a file but be defeated across the two siblings.
 *        one shared loader, imported by both, keeps that guarantee whole (decompose-for-recompose).
 *
 *        `@scure/base` publishes as pure esm (type: module, no cjs require condition), so a top-level
 *        `import { bech32 } from '@scure/base'` would compile (under module:commonjs) to a
 *        `require('@scure/base')` in dist that throws `Must use import to load ES Module` under a CJS
 *        `require()` of rhachet's dist. see rule.forbid.eager-esm-imports-in-prod + ehmpathy/rhachet#468.
 * .note = `typeof import(...)` is a type-only reference (tsc erases it), so it emits no require.
 */
type ScureBaseModule = typeof import('@scure/base');
export const getOneScureBase = getOneLazyEsmModuleLoader<ScureBaseModule>({
  specifier: '@scure/base',
  purpose: 'ssh key to age key conversion',
});
