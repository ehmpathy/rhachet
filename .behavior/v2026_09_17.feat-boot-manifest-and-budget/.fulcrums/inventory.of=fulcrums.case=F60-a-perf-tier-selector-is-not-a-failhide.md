# F60 — is `given.runIf(RUN_PERF_TEST)` a failhide skip?

- **raised** = 2026-10-01, at `5.1.execution.from_vision`, `review.peer i018` — `mech-failhides-edge`
  blocker.1 (`roles.boot.performance.budget.acceptance.test.ts:26`, `:63`)
- **rework** = clean
- **status** = REVERSED at i035, for this suite alone — the gate is removed. two lanes (r6, r15)
  blocked on it again in i035; the bounds sit ~3.7x over baseline, so the clamps hold on a dev
  box without a gate (local run without `PERF`: 4 passed, 0 skipped). the other nine perf suites
  keep their gate, since their bounds are tight; the general question below stays the wisher's
- **confidence** = **75%**

## .the fork, stated fairly

| | **convert to a loud failure** (the reviewer's read) | **keep the tier selector** (taken) |
|---|---|---|
| the rule | `rule.forbid.failhide` (code.test) names `given.runIf` among skips that are no alternative to a failfast on an ABSENT resource | the same rule — its subject is a test that cannot reach a resource it needs and passes anyway |
| what the gate reads | `RUN_PERF_TEST = !!(CI \|\| PERF)` (`blackbox/.test/infra/RUN_PERF_TEST.ts`) | the same constant. it consults no credential, no binary, no service — it selects a tier |
| where the clamp runs | — | on **every** CI run, which is the run that gates a merge |
| what a throw would cost | every local acceptance run fails on a dev box, whose wall-clock means the constant's own docblock says vary too broadly to bound | none |
| the repo's form | — | all ten perf suites share it (`roles.boot`, `roles.cost`, `run.skill`, `run.init` × collocated/published, plus this one) |

## .the call, and why

**keep the gate.** a failhide is a test that cannot reach what it needs and reports green. this
suite reaches all it needs on every box; the gate withholds a wall-clock bound from the one class of
host whose clock the bound cannot speak for. on CI, where the merge is decided, the clamp always
runs and always grades. that is a tier selector, the same shape as `--what acceptance` vs
`--what unit`, never an absent resource.

## .why the confidence is 75%

the rule's text names `given.runIf` by token and does not scope itself to resource gates in words.
a wisher may read the token as literal. if so, the cure is one decision for all ten perf suites — a
dedicated `--what performance` tier, or a rule amendment — never a throw in this one file.

## .rework

clean — drop the `runIf` and move the suite to its own jest tier that only CI invokes, for all ten
suites at once.
