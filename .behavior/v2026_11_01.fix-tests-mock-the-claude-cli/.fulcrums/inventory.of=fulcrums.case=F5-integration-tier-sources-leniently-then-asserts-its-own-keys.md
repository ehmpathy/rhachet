# F5 — the integration tier sources leniently, then asserts the keys it still reads

## .the fork

the vision says the integration tier no longer demands `ANTHROPIC_API_KEY`. the key is declared
once, in `.agent/repo=.this/role=test/keyrack.yml` `env.test`, and both tiers read that list:

- ci's keyrack firewall injects every `env.test` key into both jobs (`.github/workflows/.test.yml:231, 311`)
- the integration setup sources **strict** (`jest.integration.globalSetup.ts:25`): any absent key halts the run
- the acceptance setup sources **lenient** (`jest.acceptance.globalSetup.ts`), and the smoketests there still read the key in ci (`isRealClaudeAuthed`, `enrollCloneHarness.ts:323-330`)

so the key cannot leave `env.test`, and `sourceAllKeysIntoEnv` has no per-key exclusion
(`src/domain.operations/keyrack/sourceAllKeysIntoEnv.ts:55-82` — only `key`, `reach`, `mode`).

| option | cost |
|---|---|
| A. integration setup sources `lenient`, then asserts the keys its suites still read (`OPENAI_API_KEY`, `XAI_API_KEY`) and fails fast with a `ConstraintError` that names the unlock | one file. fail-fast holds for each key the tier needs |
| B. source each needed key by `key` | one ~20s keyrack child per key, per run |
| C. add an `omit` / `keys` filter to the keyrack sdk | a prod contract change for a test-tier need |
| D. a second keyrack env for the anthropic key | a new env name the firewall and manifests must learn |

## .taken

A. it mirrors the acceptance setup's documented lenient source, keeps one keyrack child per run,
and keeps fail-fast for every key the tier still needs. the needed keys are derived, never listed
by hand: every key the manifest declares under `env.test`, minus `ANTHROPIC_API_KEY`. so the
manifest stays the one list, and a key added there later is required by the integration tier at
once rather than silently relaxed by the lenient source.

amended 2026-11-02 after peer review: the first form held a hand-kept `['OPENAI_API_KEY', 'XAI_API_KEY']`
beside the manifest, a second list that a later key would not reach.

## .rework

clean — one setup file. a later move to C replaces the lenient call and the assert with one call.

## .confidence

80%. the one excluded key is the only judgment left; a suite that still reads `ANTHROPIC_API_KEY`
by an indirect path would surface as an in-test failure, not a setup halt.

## .where

`3.3.1.blueprint.product.yield.md` — the integration setup row.

## .verdict

best-guessed.
