# rule.forbid.faked-or-quarantined-acceptance

## .what

an acceptance test must exercise the **real external contract, end to end, with no fake
substituted for it** — and every acceptance test must run in the **default acceptance gate**,
not a separate opt-in config. two forbidden shapes, both defeat the point of acceptance:

1. a `*.acceptance.test.ts` that drives a **stub / fake / mock** in place of the real external
   dependency (a stub brain, a fake sdk, a mock http server). that is an **integration** test
   mislabeled as acceptance.
2. a **separate config** (e.g. `jest.acceptance.real.config.ts`) that **quarantines** the only
   real-contract tests out of the default acceptance run, so real coverage is opt-in / nightly
   while the per-PR "acceptance" gate proves only a fake.

## .why

the whole point of an acceptance test is to prove the real contract works — the real brain boots
under our pty, receives our dispatch, and its own reply reads back. a stub proves the
*mechanism* (bytes on a wire, a transcript on disk); it does NOT prove the *integration*. so a
stub-backed `.acceptance.test.ts` gives false confidence: green while the real contract is
broken.

quarantine of the real tier into a nightly `.real` config is the same failure one level up. if
the per-PR gate runs only the stub, a broken real integration **ships** and is not caught until
the nightly — exactly when acceptance was meant to catch it before merge. "fast and
credential-free" is not worth a gate that does not gate.

`rule.forbid.acceptance.mocks` already forbids mocks in acceptance. this rule names the two
concrete evasions observed in practice: dress the fake as "hermetic acceptance", and split the
real one into an opt-in config.

## .how to apply

- if a test uses a stub / fake / mock for the external dependency, it is an **integration**
  test — name it `*.integration.test.ts`, not `*.acceptance.test.ts` (`rule.require.test-coverage-by-grain`).
- acceptance tests drive the **real** dependency, and live in the **one** acceptance config the
  default `test:acceptance` gate runs. no `*.real.acceptance` infix, no `jest.acceptance.real.config`.
- CI supplies real credentials the normal way (keyrack) — an absent credential **fails loud**
  (`ConstraintError`, exit 2) that names the fix, NEVER skips and NEVER silently passes
  (`rule.require.failfast`).
- cost / latency / nondeterminism are managed WITHIN the real acceptance test — share one real
  spawn across turns (`useBeforeAll`), match a deterministic marker the prompt asks the brain to
  emit (not the nondeterministic prose), bound the wall-clock — NOT by demotion of the test to a
  fake or exile of it to a nightly config.

## .the test

"if the real external dependency broke, would the **default** acceptance gate go red before
merge?"

- yes → it is a real acceptance test in the default gate. good.
- no (a stub would still pass, or the real test only runs nightly) → forbidden. fix the label or
  the config.

## .enforcement

- a `*.acceptance.test.ts` that drives a stub/fake/mock for the external contract = **blocker**
  (reclassify as `*.integration.test.ts`)
- a separate config / infix that excludes real-contract tests from the default acceptance gate =
  **blocker**
- a real acceptance test that SKIPS on an absent credential instead of a loud fail = **blocker**

## .see also

- `rule.forbid.acceptance.mocks` (mechanic) — no mocks in acceptance; this names the two evasions
- `rule.require.acceptance.blackbox` (mechanic) — acceptance drives the contract surface only
- `rule.require.test-coverage-by-grain` (mechanic) — stub + fake dep = integration grain
- `rule.require.playtest-via-real-dogfood` — the byhand twin: prove via the real product, not a harness
- `philosophy.verification-strictness` (behaver) — no fake tests, no silent skips
