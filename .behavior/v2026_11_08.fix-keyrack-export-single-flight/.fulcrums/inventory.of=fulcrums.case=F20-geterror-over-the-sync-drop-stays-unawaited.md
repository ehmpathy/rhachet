# F20 — `getError` over the sync cache drop stays unawaited

- **fork** — in `genAwsProfileExport.integration.test.ts` [case14][t2], add `await` before
  `getError(() => delAwsProfileExport(…))` to match the awaited calls beside it; or leave it as written
- **taken** — leave it. `delAwsProfileExport` is synchronous (`): void =>`), and `getError` returns the
  thrown Error at once for a callback that throws synchronously; it returns a promise only for a callback
  that returns one. the awaited calls beside it wrap the async `genAwsProfileExport`
- **why not the await** — an `await` on a value that is not a promise adds naught, and it reads as if the
  drop were async, which misleads the next reader about the op's contract
- **evidence** — `rhx git.repo.test --what types` passes (were `error` a promise, `error.message` would
  be a tsc error); the integration suite passes with [case14][t2] in it (a promise is never a
  `ConstraintError`, so `toBeInstanceOf` could not hold)
- **rework** — clean. one word in one test
- **confidence 95%, short of certain because** — a reviewer flagged it, and a future `test-fns` that made
  `getError` always async would make this line wrong; tsc would then catch it
- **where** — the mech-given-when-then lane, i002 blocker.1
- **verdict** — held; the `.taken` refutes with the evidence above
