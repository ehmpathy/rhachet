# F006 — the openrouter wire contract belongs to its brain package, not to rhachet

## .the concern

`ergo-contract-snapshots-rest` (5.3 i004 r004 blocker.1) and `ergo-acceptance-journey-coverage-rest`
(5.3 i004 r008 blocker.2): the inventory entry `inventory.of=requirements.case=5` (the default peer
reviewer brain is `openrouter/deepseek/flash`) cites no test that calls the real OpenRouter service, so
`rule.require.external-contract-integration-tests` is unmet.

## .the stance — disputed; the wisher ruled 2026-10-07

- **rhachet makes no call to OpenRouter.** no product code under `src/` reaches its endpoint. the
  requirement is which brain this repo's review tooling defaults to, set by two patches
  (`patches/rhachet-roles-bhrain@0.37.2.patch`, `patches/rhachet-brains-openrouter@0.1.1.patch`)
- **what rhachet owns is proven.** `src/.test/patchedDependencies.integration.test.ts` [case1][case2]
  asserts the installed packages carry the default and the 1M window, so a dependency bump that drops a
  patch goes red
- **the real call is tested where it is made.** `ehmpathy/rhachet-brains-openrouter` already owns a
  real-call contract test. the published package ships no tests, so the repo is the citation
- **the wire path is also exercised on every guard pass** — each review lane names no `--brain`, prints
  `brain: openrouter/deepseek/flash`, and returns realized token and cost metrics

## .the wisher's ruling (2026-10-07)

a live-call test ([case3] a structured reply with token counts and a realized cost; [case4] a refusal
with no credential) was added to rhachet at 5.3 i004 to answer r005, and removed the same day: the
contract belongs to the package that makes the call, which already tests it. rhachet keeps the
patch-presence proof, and `env.test` no longer declares `OPENROUTER_API_KEY`.
