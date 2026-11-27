# F14 — the orchestrator's null-manifest swap is clamped at the cli

## .the fork
`setHookDispatchersForTarget` builds `{ rules: rules?.length ?? 0, rulesByEvent: asRuleCountsByEvent({ rules }) }`.
no test asserted that build for `rules: null` at the orchestrator grain.
- a: clamp it now
- b: keep the leaf clamps, and clamp the orchestrator once a caller reaches the path

## .taken = a
F11 made the path reachable from the cli: a hookless sync over an absent manifest calls this
orchestrator with `rules: null`. `hooks.dispatch.acceptance` [case8] [t1] snaps what it renders:

```
      ├─ 0 rules → 0 dispatchers
      ├─ 4 dispatchers taken back from the settings
```

a regression to `rules ?? []` would add four `= 0 rules` leaves under the first row, and the snapshot
would go red. the leaf clamps stay:
- `asRuleCountsByEvent.test.ts:47`
- `setHookDispatchManifestRederived` [case4] and [case5]
- `setHookDispatchersViaAdapter` [case7]

## .rework = clean, why
test-only; one acceptance scene.

## .where
`src/domain.operations/brains/dispatch/setHookDispatchersForTarget.ts:59`,
`blackbox/cli/hooks.dispatch.acceptance.test.ts` [case8]

## .verdict
settled: clamped in this pr (driver, 2026-11-27). no human harm rode on the gap: it was a test grain.
