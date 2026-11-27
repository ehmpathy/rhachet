# F6 — the per-brain catch in `setHookDispatchersForTarget` stays as it is

## .the fork
- a: leave the catch: it predates this work, and each error it collects is reported with its class and fails the run
- b: narrow it to an allowlist in this pr, and rethrow the rest

## .taken = a, why
- the catch is prior code (`b3cf79ee`, #769). this pr changes one line inside the `try` (`rules?.length ?? 0`), not the error path
- it hides naught. each collected error flows `swapResult.errors` → `asSyncResultWithSwapErrors` / `asFaultsOfBrainsUnsynced` (`syncRoleHooksIntoTarget.ts:87-98`) → a `✗ … : <ErrorClass>` row with its field leaves (`syncHooksForLinkedRoles.ts:199-211`) → `errors`, which `invokeInit` / `execUpgrade` read for exit 1 (`syncHooksForLinkedRoles.ts:302-308`)
- the one step above it already wraps the whole swap in an allowlist (`withActorHookSyncFaultCaught`, `isActorHookSyncFault`); the inner catch exists so one refused brain never skips the next brain, a stated contract (`.note` on the function)
- b would change which faults abort a multi-brain sync: a behavior change to error flow that this wish does not ask for, and that no test here would cover

## .rework = clean, why
a narrowed catch is a local edit to one function and its test; no caller shape changes.

## .confidence = 92%

## .where
`src/domain.operations/brains/dispatch/setHookDispatchersForTarget.ts:64-67`

## .verdict
open: for the director
