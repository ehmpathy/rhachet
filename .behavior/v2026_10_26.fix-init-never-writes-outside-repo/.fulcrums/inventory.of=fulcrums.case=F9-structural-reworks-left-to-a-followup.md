# F9 — structural reworks left to a followup (a dispute)

## .the fork
the l3 lanes propose reworks of the hook sync's shape. each is sound; none closes a defect the
wish names. so:
- A: do each in this hotfix
- B: catch each in one dream, and keep this diff to the wish

## .taken
B, per rework:
- **a branded guard proof** (`genBrainDirInsideRepo` → `BrainDirInsideRepo`, taken as writer
  input) in place of `assertBrainDirInsideRepo` at each writer. it turns an absent guard into a
  type error. it changes the signature of every brain dir writer and its callers; the hand-placed
  guard sits at every writer today, and each is clamped by a red-then-green test
- **the root shield scoped to the claude call alone.** with the repo actor's dir outside the repo,
  a non-claude brain's root sync skips too. to scope it, the root sync splits into a claude call
  and a call for the rest, with two prune and sync results merged. no non-claude brain ships with
  a brain dir today
- **one fault collector** that owns the count and the rows across discover, root, and actor
- **`syncHooksForLinkedRoles.ts` split** into one procedure per file (shield, actor settlement)
- **the fault row's path from the errno** rather than the actor's brain dir, and discover and
  root rows with roles, path and hint beside them

## .rework
clean — each is local to the hook sync and to the guard's callers; none moves a contract a
consumer reads. dirty to pull into a hotfix: each touches every writer or every phase, and the
release that dev-env#167 waits on would carry the ripple.

## .confidence
85%. the guard brand is the call most open to a rule the other way; it would have caught the
two writers that led their guard (`setRepoActorBrainDir`, the actors self-ignore), both found by
review and fixed here.

## .where
`.dream/v2026_10_26.refactor.hook-sync-shape-and-guard-brand.md`
