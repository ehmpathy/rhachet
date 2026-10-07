# F69 — must `syncHooksForLinkedRoles` split its phases from its output in this PR?

- **raised** = 2026-10-03, at `5.1.execution.from_vision`, `review.peer i041` —
  `enroll-impl-arch-defects` nitpick 1 (`src/domain.operations/init/hooks/syncHooksForLinkedRoles.ts`)
- **rework** = dirty
- **status** = OPEN — **no, deferred to a dream**
- **confidence** = **75%**

## .the fork, stated fairly

| | **split now** (the reviewer's read) | **defer to a dream** (taken) |
|---|---|---|
| the shape | `syncHooksIntoRoot` and `syncHooksIntoActors`, each returns `{ errors, lines }`; the top function composes and prints | one function, three phases, output interleaved |
| test seam | each phase gets its own test | both phases stay covered through the function's extant tests |
| what it touches | the function, two new files, two new test files | naught |

## .the call, and why

**defer.** the reviewer grades it `[nitpick][better]`, names no shipped harm, and notes every
decode piece inside is already a named, tested transformer (`asHookChangeSummary`,
`asHookFaultRows`, `asHookSyncTotalRows`, `getOneHookChangeTally`, `getOneHookOrphanCount`). the
interleaved style matches the peer orchestrators in the same pipeline. it is the F68 class — a
decompose-for-recompose of an orchestrator this feature extends — one file over. to split it
opens new operations and new test seams beyond the feature's scope.

the work is caught as a dream: `.dream/v2026_10_03.refactor.synchooks-split-phases-from-output.md`.

## .why the confidence is 75%

this PR reshaped the function (137 lines in, 110 out), so a reader could fairly say the split is
owed by the PR that last grew it.

## .rework

dirty — two new operations, two new test files, and a reshape of the function's test so it tests
the composition rather than each phase.
