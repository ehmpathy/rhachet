# F68 — must `execUpgrade`'s two orchestration IIFEs be extracted to named operations in this PR?

- **raised** = 2026-10-02, at `5.1.execution.from_vision`, `review.peer i036` —
  `enroll-impl-arch-defects` nitpick 1 (`src/domain.operations/upgrade/execUpgrade.ts`, the
  `upgradedGlobal` and `boots` IIFEs)
- **rework** = dirty
- **status** = OPEN — **no, deferred to a dream**
- **confidence** = **75%**

## .the fork, stated fairly

| | **extract now** (the reviewer's read) | **defer to a dream** (taken) |
|---|---|---|
| the shape | two named operations, `execGlobalUpgradeOrAbsorb` and `syncRolesAfterUpgrade`, each `(input, context)` | the two IIFEs stay inside `execUpgrade` |
| test seam | each gets its own unit test | both paths stay covered through `execUpgrade.test.ts`, which the reviewer confirms exercises both |
| what it touches | `execUpgrade.ts`, two new files, two new test files, a reshape of `execUpgrade.test.ts` | naught |
| who it serves | the next change to the upgrade flow | — |

## .the call, and why

**defer.** the reviewer grades it `[nitpick][better]` and names no shipped harm: both paths are
covered today. the extraction is a refactor of the upgrade flow's structure, which this feature
only extends (hook-sync faults and brain-dir boots now surface in its result). to split the flow
into new operations, with new seams and new tests, ripples into files this feature never opened
and widens a diff that reviewers already read at its limit.

the work is caught as a dream: `.dream/v2026_10_02.refactor.execupgrade-extract-orchestration-iifes.md`.

## .why the confidence is 75%

the IIFEs grew in this PR — the `boots` block carries the hook-sync and brain-dir-sync steps this
feature added — so a reader could fairly say the extraction is owed by the PR that grew them.

## .rework

dirty — two new operations, two new test files, and a reshape of `execUpgrade.test.ts` so it
tests the composition rather than each step.
