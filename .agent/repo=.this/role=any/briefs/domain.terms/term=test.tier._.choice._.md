# domain.term: test.tier

term.chosen   = tier
term.kind     = noun
term.boundary = test
term.synonyms.forbidden:
- type
- level
- suite            # ⚠️ NOT a synonym — a suite is ONE file. see .reason
- stage

## .what

**a named test scope with its own runner invocation, its own boundary rules, and its own place in
the gate order** — the value `git.repo.test --what` takes:

```
types · format · lint · unit · integration · acceptance
```

a tier is the unit a gate reports on. `unit` forbids remote boundaries; `integration` forbids
mocks; `acceptance` forbids mocks AND must drive the contract. so the tier a test sits in decides
which rules apply to it, which is why the word must be one word.

## ⚠️ .what a tier is NOT

- **not a suite.** a suite is one file. a tier is a set of suites the runner selects together.
  `398 suites` inside the `unit` tier is the normal shape.
- **not a keyrack `grade`.** `term=grade._.choice._.md` lists `tier` among its forbidden synonyms.
  that forbid holds **inside the keyrack boundary**, where the concept is *how well a key is
  protected*. this term lives in the **test** boundary. see `.reason`.

## .refs
- `rhx git.repo.test --what <tier>`                       # the flag the value fills
- `blackbox/.test/infra/RUN_PERF_TEST.ts`                 # a declared sub-gate WITHIN the acceptance tier
- `howto.run-jest-tiers-locally.[lesson].md`              # the extant brief that already uses the word
- `rule.forbid.unit.remote-boundaries`                    # a rule keyed on the tier
- `rule.forbid.integration.mocks` · `rule.forbid.acceptance.mocks`
- `rule.require.test-coverage-by-grain`                   # maps grain → tier

## .reason
- `term=test.tier._.choice.reason.md` — etymology, the `grade` near-collision, the `type` drift
