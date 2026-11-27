# F12 — a sync reads past a corrupt manifest row

## .the fork
a dispatcher that meets a corrupt manifest refuses every call, and names `rhx init --hooks` as the fix.
that sync read the same file through `asHookDispatchRulesFromManifestText`, which threw
`hook dispatch manifest row is malformed`, and exited 1. so the fix the refusal named could not run.
- a: make the sync read past the corrupt row and rewrite the manifest, in this pr
- b: prove remove-then-sync, and catch the cure as a dream

## .the test (S3)
does the `*` wire make a harm worse that a human then hits? **yes.** a union wire refused only the tools
its rows named, while a `*` wire refuses every tool. the human then runs the sync the refusal names,
and it fails on the same file.

## .taken = a
a new step, `setHookDispatchManifestRepaired`, reads each row on its own:
- it keeps each row that parses and drops each one that does not
- it rewrites the file as a sync writes it, so a bad header is mended too
- `setHookDispatchManifestsRepairedForTarget` runs it per target, before the prune, the sync and the
  swap read the manifest
- the hookless sync runs it as well (F11)

the sync names the rewrite:

```
🪝 hook dispatch manifest rewritten past corrupt rows
   └─ anthropic/claude/code
      ├─ 1 corrupt row dropped
      └─ manifest = .claude/hooks.dispatch.manifest
```

a dropped row is never guessed at. the report counts it, so a human can add back a hand row it cost.
the dispatcher's own read stays a hard refusal (it fails closed).

clamps:
- `hooks.dispatch.acceptance` [case2] [t3]: the sync runs over the corrupt file, exits 0, leaves the
  settings byte-equal, and the Agent row runs again. measured red before the cure: exit 1
- [case8] [t0]: the same in a hookless seat. a Read call is refused before the sync and passes after
- `setHookDispatchManifestRepaired.integration.test.ts`: a readable manifest stays byte-equal; one
  corrupt row beside one readable row leaves the readable row; an all-corrupt file becomes an empty
  manifest; an absent one stays absent

the enroll path still reads the repo manifest whole. it fails loud with a classed error and never
spawns a clone, so no human is left with a silent refusal. after the next `rhx init --hooks` the
manifest reads, and enroll passes.

## .rework = clean, why
two new leaf files, one new step at the head of each target sync. callers keep their shape.

## .where
`src/domain.operations/brains/dispatch/setHookDispatchManifestRepaired.ts`,
`src/domain.operations/brains/dispatch/setHookDispatchManifestsRepairedForTarget.ts`,
`src/domain.operations/init/hooks/syncRoleHooksIntoTarget.ts`

## .verdict
settled: lands in this pr (driver, 2026-11-27, per S3). the dream it once had is retired.
