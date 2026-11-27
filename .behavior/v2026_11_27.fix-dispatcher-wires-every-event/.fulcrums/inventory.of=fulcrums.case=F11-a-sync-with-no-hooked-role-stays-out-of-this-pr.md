# F11 — a sync with no hooked role stays out of this pr

## .the fork
`syncHooksForLinkedRoles` returns at "no roles with hooks found" before it prunes orphan rows or settles
the wires. a seat whose last hooked role drops its hooks keeps its rows and its wires.
- a: move the early return below the orphan prune and the dispatcher step, in this pr
- b: leave it; count and report the take-back where the sync does reach it, and catch the early return
  as a dream

## .taken = b, why
the gap predates this wish: on main the same return keeps the union wires and the stale rows. the
take-back step this pr touches now counts what it removes (`dispatchersTakenBack`) and the swap report
names it, proven at unit and integration grain. to move the return changes the orphan prune and actor
pass control flow for every hookless repo, outside the wire shape the wish bounds.

## .rework = dirty, why
the return gates the orphan prune, the root pass and the actor pass. callers and snapshots across the
init suites assume a hookless repo prints only `🫧 no roles with hooks found`.

## .confidence = 80%, why
the `*` wire widens the blast radius of one contrived path: a hand-deleted manifest under a hookless
role now refuses every tool, not just the union's tools. the director may want it in this pr.

## .where
`src/domain.operations/init/hooks/syncHooksForLinkedRoles.ts:96-101`;
dream `.dream/v2026_11_27.fix.hook-sync-skips-take-back-when-no-role-holds-hooks.md`
