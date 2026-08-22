import { importEsmSafe } from './importEsmSafe';

/**
 * .what = derive the actionable hint for a failed lazy esm load, keyed to the runtime that failed
 * .why = importEsmOrRequire loads by two different mechanisms (import() in real node, require()
 *        under jest), so a single hint would misdirect one runtime. this names the REAL fix for
 *        each: real node → the pure-esm dep must load as esm; jest → the dep's require() must be
 *        covered by the consumer's own jest transform + transformIgnorePatterns. shared by every
 *        keyrack getter that wraps a load failure in a MalfunctionError (rule.require.errors-name-the-fix).
 * .note = the jest hint names "your jest transform", NOT rhachet's own @swc/jest: this code ships in
 *         rhachet's dist and runs inside DOWNSTREAM consumers' jest processes too (ts-jest, babel-jest,
 *         @swc/jest), so a hint that named rhachet's own transformer choice would misdirect them.
 * .note = `runtime` is an OPTIONAL injected override (input-options pattern). it defaults to the real
 *         runtime read of `JEST_WORKER_ID`. a unit test injects `'jest'` / `'node'` to pin BOTH hint
 *         variants WITHOUT a mutation of the shared `process.env.JEST_WORKER_ID` (which every suite in
 *         the same jest worker reads — a mutation of it races concurrent suites).
 */
export const getOneEsmLoadFailureHint = (
  input: {
    specifier: string;
  },
  options?: { runtime?: 'jest' | 'node' },
): string => {
  const runtime =
    options?.runtime ??
    (process.env.JEST_WORKER_ID !== undefined ? 'jest' : 'node');
  return runtime === 'jest'
    ? `under jest, ${input.specifier} loads via require(); ensure it is installed AND covered by your jest transform + transformIgnorePatterns so it down-levels to cjs`
    : `ensure ${input.specifier} is installed and loads as esm in this node runtime (a genuine import() of this pure-esm package must succeed)`;
};

/**
 * .what = load an esm module by the strategy the RUNTIME dictates: a genuine runtime import() in
 *         real node (prod), a require() under jest (which refuses a real import() without
 *         --experimental-vm-modules).
 * .why  = the keyrack crypto adapters (ageRecipientCrypto, mechAdapterGithubApp) must load their
 *         pure-esm deps (age-encryption, @octokit/auth-app) LAZILY so rhachet's dist carries no
 *         top-level require() of a pure-esm package — the fix for a CJS require('rhachet') under
 *         jest / a brain package's compiled CJS (rule.forbid.eager-esm-imports-in-prod,
 *         ehmpathy/rhachet#468). unlike the brain load-sites (which mock importPackageExports
 *         under jest), these adapters run REAL crypto in their own jest tests, so the lazy load
 *         must survive BOTH runtimes:
 *           - real-node dist (prod): import() works; a require() of a pure-esm package would throw,
 *             so import() (via importEsmSafe) is the correct strategy.
 *           - jest process:          import() throws the no-vm-modules error; require() works,
 *             because jest's swc transform + transformIgnorePatterns down-level the esm dep to cjs.
 * .why.deterministic = the strategy is chosen by an EXPLICIT runtime flag — `JEST_WORKER_ID`, which
 *         jest sets in every worker — NOT by a match on an incidental error message. a message-text
 *         guess ('--experimental-vm-modules') is fragile: a jest reword silently stops the fallback,
 *         and ANY other import() failure whose text held that phrase would misroute control into a
 *         require() of a pure-esm package. a check of the env flag removes both hazards: the branch
 *         is decided by the caller's runtime, not by an error's text.
 * .note = the require() branch is UNREACHABLE outside jest (real node has no `JEST_WORKER_ID`), and
 *         it is a scoped, dynamic-specifier require inside this lazy call — NEVER at module-eval. so
 *         it does NOT reintroduce the #468 load-time require: a CJS require('rhachet') evaluates the
 *         adapter module without a single touch of this require (it fires only when crypto actually
 *         runs, and only under jest). the real-node consumer path — the environment #468 targets —
 *         takes importEsmSafe's genuine import(), never a require() of a pure-esm package.
 */
export const importEsmOrRequire = async <TModule>(input: {
  specifier: string;
}): Promise<TModule> => {
  // jest is detected deterministically: it sets JEST_WORKER_ID in every worker process. real node
  // (prod, downstream auto-discovery, the real-node acceptance probe) never sets it.
  const isJest = process.env.JEST_WORKER_ID !== undefined;

  // real-node (prod) strategy: a genuine import() via the esm-safe boundary. never a require() of a
  // pure-esm package — this is the environment #468 targets.
  if (!isJest) return importEsmSafe<TModule>({ specifier: input.specifier });

  // jest strategy: a runtime require the swc transform + transformIgnorePatterns down-level to cjs.
  // scoped, dynamic-specifier require — never hoisted, never at module-eval (so it is not the #468
  // landmine), and provably unreachable outside jest (the isJest guard above).
  // as-cast exception: a dynamically-required module is untyped at this boundary, so the result is
  // asserted to the caller's declared TModule — the same single boundary cast importEsmSafe makes on
  // its import() result. removal path: same as importEsmSafe (typed exports from the loaded
  // package). (rule.forbid.as-cast)
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require(input.specifier) as TModule;
};
