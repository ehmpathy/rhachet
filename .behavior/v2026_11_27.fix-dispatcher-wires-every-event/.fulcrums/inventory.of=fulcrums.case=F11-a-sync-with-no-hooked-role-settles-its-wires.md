# F11 — a sync with no hooked role settles its wires

## .the fork
`syncHooksForLinkedRoles` returned at "no roles with hooks found" before any manifest or wire step. so a
seat whose last hooked role drops its hooks kept two things:
- its manifest rows, which still fire under the wires
- its four wires. at an absent manifest, each one refuses every tool, and the fix it names
  (`rhx init --hooks`) changed naught

two branches:
- a: settle the root's wires in the hookless sync, in this pr
- b: leave the early return, and catch it as a dream

## .the test (S3)
does the `*` wire make a harm worse that a human then hits?
- **the wires at an absent manifest: worse.** a union wire refused only the tools its rows named, while
  a `*` wire refuses every tool. the human then meets a refusal whose fix loops
- **the stale rows in a readable manifest: as it was.** the dispatcher filters each row by its own
  matcher, so a stale row fires on the same calls under a union wire or a `*` wire

## .taken = a, for the worsened half
the hookless sync now runs `syncHookDispatchersIntoTarget` for the root target:
- it repairs a corrupt manifest first (F12)
- then `setHookDispatchersForTarget` takes back every wire at an absent manifest
- the dispatcher step reads through `getOneBrainHookDispatchOfTarget`, which never migrates, so a repo
  with no manifest stays wire-less (F4)

a hookless repo that never held a hook prints what it printed before, `🫧 no roles with hooks found`.
the clamp is `hooks.dispatch.acceptance` [case8] [t1]: the manifest goes, the sync takes back four
wires, and the swap report says so. measured red before the cure: all four wires stayed.

the stale-row prune, the half the `*` wire leaves as it was, waits for its dream
(`.dream/v2026_11_27.fix.hook-sync-skips-take-back-when-no-role-holds-hooks.md`). so does the hookless
actor pass.

## .rework = clean, why
one branch in `syncHooksForLinkedRoles`, one target step, one getter split out of
`getOneBrainHooksAdapterForSync`. a hookless repo with no wires sees no output change. init, upgrade
and enroll acceptance hold their snapshots, apart from three drifts that come from the unstaged
declapract bump.

## .where
`src/domain.operations/init/hooks/syncHooksForLinkedRoles.ts`,
`src/domain.operations/init/hooks/syncHookDispatchersIntoTarget.ts`,
`src/domain.operations/brains/dispatch/getOneBrainHookDispatchOfTarget.ts`

## .verdict
settled: the worsened half lands in this pr (driver, 2026-11-27, per S3). the stale-row prune waits for
its dream.
