# F14 — the orchestrator's null-manifest swap is clamped with the F11 fix

## .the fork
`setHookDispatchersForTarget` builds `{ rules: rules?.length ?? 0, rulesByEvent: asRuleCountsByEvent({ rules }) }`.
no test asserts that build for `rules: null` at orchestrator grain.
- a: add an orchestrator test now
- b: keep the leaf clamps now, and clamp the orchestrator with the F11 fix

## .taken = b, why
each leaf is clamped:
- `asRuleCountsByEvent({ rules: null })` → `[]` (unit [case] at `asRuleCountsByEvent.test.ts:47`)
- `setHookDispatchManifestRederived` absent → `null`, empty → `[]` (integration [case4], [case5])
- the adapter's take-back over `rules: null` → `dispatchersTakenBack: 4` (integration [case7])
- the render of that swap (unit, snapped)

the orchestrator reaches `rules: null` only where the manifest is absent at the dispatcher step. a sync
with a hooked role writes the manifest first, and a sync with none returns before this step (F11). so
the one caller that would drive this path is the F11 fix, and its clamp is the orchestrator test for
`null`. a test now would fake a scene the cli cannot reach.

## .rework = clean, why
one test file, no production change.

## .confidence = 80%, why
an orchestrator test with a hand-made brain dir could reach the path today. the reviewer may weigh
grain over reachability.

## .where
`src/domain.operations/brains/dispatch/setHookDispatchersForTarget.ts:59`
